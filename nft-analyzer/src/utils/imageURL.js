export const getTokenImageURL = (imageData) => {
  if (imageData.inclues('ipfs://')) {
    return `https://ipfs.io/ipfs/${imageData.split('ipfs://')[1]}`;
  }
  return imageData;
}