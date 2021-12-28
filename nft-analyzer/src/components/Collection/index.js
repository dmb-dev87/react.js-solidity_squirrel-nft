import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { isAddress } from "@ethersproject/address";
import CollectionInfo from "../CollectionInfo";
import { getTokenMetadata } from "../../utils/getTokenMetadata";
import { prepareRequestURL } from "../../utils/prepareRequestUrl";
import { sendRequests } from "../../utils/sendRequests";
import { ComputeCollectionData } from "../../utils/ComputeData";
import RankingTable from "../RankingTable";
import PropertiesTable from "../PropertiesTable";
import { ProgressBar } from "react-bootstrap";
import LoadingData from "../LoadingData";
import ErrorMessage from "../ErrorMessage";
import InvalidAddress from "../InvalidAddress";

import "./Collection.css";

function Collection() {
  const { contractAddress } = useParams();
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hideFilters, setHideFilters] = useState(false);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [tokenURI, setTokenURI] = useState("");
  const [totalSupply, setTotalSupply] = useState(0);
  const [rarityData, setRarityData] = useState();
  const [nftDataArray, setNftDataArray] = useState([]);
  const [progress, setProgress] = useState("1");
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState([]);

  useEffect(() => {
    if (isAddress(contractAddress)) {
      setIsValid(true);
    } else {
      return;
    }

    const asyncTokenMetadata = async () => {
      try {
        const tokenMetadata = await getTokenMetadata(contractAddress);
        console.log(tokenMetadata);
        if (tokenMetadata.tokenURI === undefined) {
          setError(true);
          return;
        }
        if (tokenMetadata.totalSupply === undefined) {
          //sometimes it's impossible to read the totalSupply from the blockchain
          setTotalSupply(10000);
        } else {
          setTotalSupply(Number(tokenMetadata.totalSupply));
        }

        setName(tokenMetadata.name);
        setSymbol(tokenMetadata.symbol);
        setTokenURI(tokenMetadata.tokenURI);
      } catch (err) {
        console.log(err);
        setError(true);
      }
    };
    asyncTokenMetadata();
  }, []);

  useEffect(() => {
    let metadata_array = [];
    let analyzed_size = 0;
    let failed = 0;

    const asyncTokenURIData = async () => {
      let res;
      const requestURL = await prepareRequestURL(tokenURI);
      let tokenIDs = Array.from(Array(totalSupply + 1).keys());
      tokenIDs.shift();
      do {
        res = prepareBatchToSend(tokenIDs);
        let { new_data, failedInRequest } = await sendRequests(
          requestURL,
          res.tokenIDs
        );
        failed += failedInRequest;
        new_data.forEach((data) => {
          metadata_array.push(data);
        });

        analyzed_size = totalSupply - res.remaining - failed;
        const { rarity_data, nftDataArray } = ComputeCollectionData(
          metadata_array,
          analyzed_size
        );

        if (failed >= 100) {
          setProgress(100);
          return;
        }
        setProgress(100 - (res.remaining / totalSupply) * 100);
        setRarityData(rarity_data);
        setNftDataArray(nftDataArray);
        setIsLoading(false);
      } while (res.remaining !== 0 && failed <= 100);
    };

    const prepareBatchToSend = (tokenIDs) => {
      const BATCH_SIZE = 200;
      let remaining;
      if (tokenIDs.length <= BATCH_SIZE) {
        remaining = 0;
        return { tokenIDs: tokenIDs, remaining };
      }
      const newBatch = tokenIDs.slice(0, BATCH_SIZE - 1);
      tokenIDs.splice(0, BATCH_SIZE - 1);
      remaining = tokenIDs.length;
      return { tokenIDs: newBatch, remaining };
    };

    if (tokenURI !== "" && totalSupply !== 0) {
      try {
        asyncTokenURIData();
      } catch (err) {
        console.log(err);
        setError(true);
      }
    }
  }, [tokenURI, totalSupply]);

  const toggleFilters = () => {
    setHideFilters(!hideFilters);
  };
  const renderContent = () => {
    if (!isValid) {
      return <InvalidAddress />;
    } else if (error) {
      return <ErrorMessage />;
    } else if (isLoading) {
      return <LoadingData />;
    } else {
      return (
        <div>
          <CollectionInfo
            contractAddress={contractAddress}
            name={name}
            symbol={symbol}
            tokenURI={tokenURI}
          />
          <div className="progressBarWrapper">
            <ProgressBar
              variant="success"
              animated
              now={progress}
              label={`${progress}%`}
              className="progressBar"
            />
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <button onClick={toggleFilters} className="filterButton">
              {hideFilters ? (
                <span>show filters</span>
              ) : (
                <span>hide filters </span>
              )}
            </button>
          </div>

          <div style={{ display: hideFilters ? "none" : "block" }}>
            <div className="twoTables">
              {rarityData !== undefined &&
                rarityData.traits_types.map((property) => {
                  return (
                    <div className="marginDiv">
                      <PropertiesTable
                        property={property}
                        filters={filters}
                        setFilters={setFilters}
                      ></PropertiesTable>
                    </div>
                  );
                })}
            </div>
          </div>

          <RankingTable
            properties={rarityData.traits_types}
            nftDataArray={nftDataArray}
            contractAddress={contractAddress}
            filters={filters}
          />
        </div>
      );
    }
  };

  return <div>{renderContent()}</div>;
}

export default Collection;
