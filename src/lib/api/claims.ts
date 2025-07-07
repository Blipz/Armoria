import {MONGO_ID, MONGO_PASS} from "$env/static/private";
import {MongoDBConnector} from "./dbConnector";

const MONGO_URL = `mongodb+srv://${MONGO_ID}:${MONGO_PASS}@cluster0.auhmw.mongodb.net/armoria_api?retryWrites=true&w=majority`;
const DB_NAME = "armoria_api";
const COLLECTION_NAME = "claims";

type Claim = {
  name: string;
  coa: string;
  key?: string;
};

export function getClaim(name: string) {
  return;
}

export function setClaim(claim: Claim) {
  return;
}

export function reclaim(claim: Claim) {
  return;
}

export function unclaim(name: string) {
  return;
}
