const { ConcurrencyManager } = require("axios-concurrency");
const axios = require("axios");
const { getTokenImageURL } = require("./imageURL");

const MAX_CONCURRENT_REQUESTS = 30;

export async function sendRequests(requestURL, batchTokenIds) {
  let new_data = [];
  let api = axios.create({
    baseURL: requestURL
  });
  let failedInRequest = 0;
  const manager = ConcurrencyManager(api, MAX_CONCURRENT_REQUESTS);
  try {
    const results = await Promise.allSettled(batchTokenIds.map(id => api.get(`/${id}`)));
    failedInRequest = results.filter(result => (result.status === "rejected")).length;
    const validResults = results.filter(result => !(result.status === "rejected"));
    let values = validResults.map(a => a.value);
    values.forEach((value) => {
      value.data["id"] = value.config.url.split('/').pop();
      value.data.image = getTokenImageURL(value.data.image);
      new_data.push(value.data);
    })
  } catch (err) {
    console.log(err);
  }

  manager.detach();
  return {new_data, failedInRequest};
}