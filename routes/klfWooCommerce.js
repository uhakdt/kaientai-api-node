import express from 'express';
import request from 'request';
import * as email from '../auxillary/email.js';
import { GetDateAndTimeNow } from '../auxillary/dateAndTimeNow';

const router = express.Router();


let currentURL = process.env.URL;

if(process.env.NODE_ENV === 'Development') {
  currentURL = process.env.URL_DEV
}

const reqOptGetProducts = {
  url: `${currentURL}/api/v1/products/all`,
  method: 'GET'
};


router.post('/api/v1/klf/woocommerce/:supplierID', async (req, res) => {
  try {

    // Variable declarations
    let listOfOrderProducts = []
    for (let i = 0; i < req.body.dataBody.line_items.length; i++) {
      let orderProduct = {
        title: null,
        price: null,
        imageUrl: null,
        quantity: null,
      }
      const e = req.body.dataBody.line_items[i];
      orderProduct.title = e.name;
      orderProduct.price = e.price;
      orderProduct.quantity = e.quantity;
      listOfOrderProducts.push(orderProduct);
    }
    console.log("---------------------------------")
    console.log("ALL ORDER PRODUCTS: \n", listOfOrderProducts)
    console.log("---------------------------------")

    let dataMain = {
      orderID: null,
      name: req.body.dataBody.shipping.first_name + " " + req.body.dataBody.shipping.last_name,
      email: req.body.dataBody.billing.email,
      phone: req.body.dataBody.billing.phone,
      address1: req.body.dataBody.shipping.address_1,
      address2: req.body.dataBody.shipping.address_2,
      city: req.body.dataBody.shipping.city,
      county: "",
      country: req.body.dataBody.shipping.country,
      postcode: req.body.dataBody.shipping.postcode,
      intUserID: null,
      extUserID: null,
      orderProducts: listOfOrderProducts,
      totalAmount: req.body.dataBody.total,
      extOrderID: req.body.dataBody.id,
      supplierID: req.params.supplierID,
      supplierContactName: "Friendly Soaps",
      supplierContactEmail: "mierdluffy@gmail.com",
      dateAndTime: GetDateAndTimeNow()
    }
    
    const reqOptPostCodeCheck = {
      url: `${currentURL}/api/v1/postcode/check`,
      method: 'POST',
      json: {
        "supplierID": dataMain.supplierID,
        "code": dataMain.postcode
      },
    };

    const reqOptAddAddress = {
      url: `${currentURL}/api/v1/address`,
      method: 'POST',
      json: {
        "address1": dataMain.address1,
        "address2": dataMain.address2,
        "city": dataMain.city,
        "county": dataMain.county,
        "country": dataMain.country,
        "postcode": dataMain.postcode
      },
    };

    const reqOptAddUser = {
      url: `${currentURL}/api/v1/user`,
      method: 'POST',
      json: {
        "name": dataMain.name,
        "email": dataMain.email,
        "phone": dataMain.phone,
        "addressID": null,
        "dateAndTimeSignUp": dataMain.dateAndTime,
        "profileImageUrl": null,
        "extUserID": dataMain.extUserID
      },
    };

    const reqOptCheckExtOrderExists = {
      url: `${currentURL}/api/v1/order/ext/${dataMain.extOrderID}`,
      method: 'GET'
    }

    const reqOptAddOrder = {
      url: `${currentURL}/api/v1/order`,
      method: 'POST',
      json: {
        "dateAndTime": dataMain.dateAndTime,
        "statusID": 1,
        "supplierID": dataMain.supplierID,
        "userID": null,
        "totalAmount": dataMain.totalAmount,
        "contactName": dataMain.name,
        "contactEmail": dataMain.email,
        "contactPhone": dataMain.phone,
        "address1": dataMain.address1,
        "address2": dataMain.address2,
        "city": dataMain.city,
        "county": dataMain.county,
        "country": dataMain.country,
        "postcode": dataMain.postcode,
        "offerID": null,
        "extOrderID": dataMain.extOrderID,
        "cartProducts": dataMain.orderProducts
      },
    };

    const reqOptAddOrderProduct = {
      url: `${currentURL}/api/v1/orderProduct`,
      method: 'POST',
      json: {
        "orderID": null,
        "title": null,
        "quantity": null
      },
    };

    const reqOptUpdateStock = {
      url: `${currentURL}/api/v1/product/stock`,
      method: 'PUT',
      json: {
        "id": null,
        "stock": null
      },
    };

    // CHECK POSTCODE
    request(reqOptPostCodeCheck, (error, resPostCodeCheck, body) => {
      if (error) {
        console.log(error);
      } else if (resPostCodeCheck.body.local === 'yes') {
        
        // ADD ADDRESS
        request(reqOptAddAddress, (error, resAddAddress, body) => {
          if(error){
            console.log(error);
          } else if (resAddAddress.statusCode === 201) {
            let addressID = resAddAddress.body.data.address.id;
            reqOptAddUser.json.addressID = addressID;
            // ADD USER
            request(reqOptAddUser, (error, resAddUser, body) => {
              reqOptAddOrder.json.userID = resAddUser.body.data.user.id;
              dataMain.intUserID = resAddUser.body.data.user.id;
              if(reqOptAddOrder.json.userID != null && dataMain.intUserID != null){
                CheckOrderFulfilment(reqOptCheckExtOrderExists, reqOptAddOrder, reqOptAddOrderProduct, reqOptUpdateStock, dataMain);
              }
            })
          }
        })

      } else if(resPostCodeCheck.statusCode === 204) {
        console.log("We do not cover this postcode area: ", resPostCodeCheck.body.data.postcode);
      } else {
        console.log("Wrong Postcode input: ", resPostCodeCheck.body.data.postcode);
      }
    });

    res.status(200).json({
      status: "If Kaientai can fulfil it, we will send you a confirmation email."
    })
  } catch (error) {
    console.log(error)
  }
})


let CheckOrderFulfilment = async (reqOptCheckExtOrderExists, reqOptAddOrder, reqOptAddOrderProduct, reqOptUpdateStock, dataMain) =>  {
  // CHECK IF ORDER CAN BE FULFILED
  let orderToBeFulfilledCount = 0;
  let orderToBeFulfilled = false;
  request(reqOptGetProducts, (error, resGetProducts, body) => {
    let listOfProduct = JSON.parse(body);
    listOfProduct = listOfProduct.data.products;

    // ORDER ITEMS QUANTITY <= STOCK ITEMS QUANTITY
    dataMain.orderProducts.forEach(orderItem => {
      for (let i = 0; i < listOfProduct.length; i++) {
        let stockItem = listOfProduct[i];
        if(stockItem.title.toLowerCase() === orderItem.title.toLowerCase() && orderItem.quantity <= stockItem.stock){
          orderToBeFulfilledCount += 1;
          break;
        }
      }
    })
    if(orderToBeFulfilledCount === dataMain.orderProducts.length){
      orderToBeFulfilled = true;
    }
    if(orderToBeFulfilled){

      // CHECK IF ORDER EXISTS
      request(reqOptCheckExtOrderExists, (error, resCheckExtOrderExists, body) => {
        let bool;
        if(body.includes("order")){
          bool = true
        } else {
          bool = false;
        }
        if(!bool) {
          // ADDING ORDER
          request(reqOptAddOrder, (error, resAddOrder, body) => {
            dataMain.orderID = resAddOrder.body.data.order.id;
            //ITERATE OVER ORDER ITEMS
            for (let i = 0; i < dataMain.orderProducts.length; i++) {
              const orderItem = dataMain.orderProducts[i];
              // ITERATE OVER STOCK ITEMS
              for (let i = 0; i < listOfProduct.length; i++) {
                const stockItem = listOfProduct[i];
                // UPDATE STOCK = STOCK - ORDER
                reqOptUpdateStock.json.id = stockItem.id
                reqOptUpdateStock.json.stock = stockItem.stock - orderItem.quantity;
                if(orderItem.title.toLowerCase() === stockItem.title.toLowerCase()){
                  request(reqOptUpdateStock, (error, resUpdateStock, body) => {
                    console.log("Updating stock")
                  })
                }
              }
            }

            email.SendEmailToKaientai(dataMain);
            email.SendEmailToSupplier(dataMain);
          })
        } else {
          console.log("Order already exists.");
        }
      })
    } else {
      console.log("Order cannot be fulfiled.");
    }
  })
}


export default router;