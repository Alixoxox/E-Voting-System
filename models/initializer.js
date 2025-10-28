import candConstM from "../models/candConstM.js";
import areaM from "../models/areaM.js";
import candidateM from '../models/candidateM.js';
import cityM from "../models/cityM.js";
import ConstituencyM from "../models/ConstituencyM.js";
import ElectionM from "../models/ElectionM.js";
import partyM from "../models/partyM.js";
import ProvinceM from '../models/ProvinceM.js';
import UserM from '../models/userM.js';
import votesM from "../models/votesM.js";
import constituencyArea from "./constituencyArea.js";
import ElectionResulM from "./ElectionResults.js";
export async function initTables() {
    await UserM.createTable();
    await ProvinceM.createTable();
    await partyM.createTable();
    await cityM.createTable();
    await areaM.createTable();
    await ConstituencyM.createTable();
    await ElectionM.createTable();
    await candidateM.createTable();
    await candConstM.createTable();
    await votesM.createTable();
    await constituencyArea.createTable();
    await ElectionResulM.createTable();
  }