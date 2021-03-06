import request from 'request-promise';
import { HostUrl } from '../../auxillary/globalVariables';

export async function checkEnoughStock (dataMain) {
  let orderToBeFulfilledCount = 0;
  let orderToBeFulfilled = false;
  let res = {
    url: `${HostUrl}/products/${dataMain.supplierID}`,
    method: 'GET'
  };

  let listOfProduct = await request(res);
  listOfProduct = JSON.parse(listOfProduct).data.products;

  dataMain.orderProducts.forEach(orderItem => {
    for (let i = 0; i < listOfProduct.length; i++) {
      let stockItem = listOfProduct[i];
      if(stockItem.extID === orderItem.extID.toString() && orderItem.quantity <= stockItem.stock){
        orderToBeFulfilledCount += 1;
        break;
      }
    }
  })
  if(orderToBeFulfilledCount === dataMain.orderProducts.length){
    orderToBeFulfilled = true;
  }
  return orderToBeFulfilled;
}