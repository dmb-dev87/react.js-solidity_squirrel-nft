const { utils } = require("ethers");
const hre = require("hardhat");

async function main() {
  const baseTokenURI = "ipfs://QmarLkr5cPfZC9nukser1CpLCVm5wKdYkKTnahVLa9xN4a/";

  const [owner] = await hre.ethers.getSigners();

  const contractFactory = await hre.ethers.getContractFactory("NFTCollectible");

  const contract = await contractFactory.deploy(baseTokenURI);

  await contract.deployed();

  console.log("Contract deployed to:", contract.address);

  let txn = await contract.reserveNFTs();
  await txn.wait();
  console.log("10 NFTs have been reserved");

  txn = await contract.mintNFTs(3, { value: utils.parseEther('0.03') });
  await txn.wait();

  let tokens = await contract.tokensOfOwner(owner.address);
  console.log("Owner has tokens: ", tokens);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });