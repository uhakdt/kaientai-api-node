let currentURL = process.env.URL_PROD;

if(process.env.NODE_ENV === 'Development') {
  currentURL = process.env.URL_DEV
}

export function postcodeCheckReqOpts (dataMain) {
  console.log(currentURL)
  let res = {
    url: `${currentURL}/api/v1/postcode/check`,
    method: 'POST',
    json: {
      "supplierID": dataMain.supplierID,
      "code": dataMain.postcode
    },
  };
  return res;
}