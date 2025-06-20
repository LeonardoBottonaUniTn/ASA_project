"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deliveroo_js_client_1 = require("@unitn-asa/deliveroo-js-client");
const dotenv_1 = require("dotenv");
dotenv_1.dotenv.config();
var token = process.env.CLIENT_TOKEN;
const client = new deliveroo_js_client_1.DeliverooApi('http://localhost:8080', token);
