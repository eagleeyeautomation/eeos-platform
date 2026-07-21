import "dotenv/config";
import { createEeosApp } from "./app";
import { assertCoreProductionConfig } from "./startup";

assertCoreProductionConfig();
export default createEeosApp();
