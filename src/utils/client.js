import { DeliverooApi } from '@unitn-asa/deliveroo-js-client'
import { dotenv } from 'dotenv'

dotenv.config()

var token = process.env.CLIENT_TOKEN

const client = new DeliverooApi('http://localhost:8080', token)
