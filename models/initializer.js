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
import auditLogsM from "./auditLogsM.js";
const admin=[
    { name: "Sufyan", email: "admin@vote.com", password: "admin123", cnic: "00000-0000000-0", province: "Sindh", city: "Karachi", area: "Clifton" },
  { name: "Ammar", email: "officer@vote.com", password: "secure123", cnic: "11111-1111111-1", province: "Punjab", city: "Lahore", area: "Gulberg" }
]

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
  await auditLogsM.createTable();
  await UserM.PutAdmin(admin);
  }