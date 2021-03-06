import request from 'request-promise';
import { GetDateAndTimeNow } from 'kaientai-auxiliary';
import { HostUrl } from '../../auxillary/globalVariables';

export async function createNewOrder (dataMain) {
  let result;
  const res = {
    url: `${HostUrl}/order`,
    method: 'POST',
    json: {
      "dateAndTime": GetDateAndTimeNow(),
      "supplierID": dataMain.supplierID,
      "userID": dataMain.userID,
      "totalAmount": dataMain.totalAmount,
      "contactName": dataMain.name,
      "contactEmail": dataMain.email,
      "contactPhone": dataMain.phone,
      "address1": dataMain.address1,
      "address2": dataMain.address2,
      "country": dataMain.country,
      "postcode": dataMain.postcode,
      "extOrderID": dataMain.extOrderID,
      "status": dataMain.status,
      "orderProducts": dataMain.orderProducts
    },
  };
  
  await request(res)
  .then(function (response){
    result = response
  })
  .catch(error => {
    result = error.response.body;
  });
  return result;
}