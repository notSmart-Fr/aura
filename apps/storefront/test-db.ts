import { getPayload } from "payload"
import config from "./payload.config.js"

async function run() {
  console.log("Initializing payload...")
  const payloadInstance = await getPayload({ config })
  console.log("Fetching pages...")
  const res = await payloadInstance.find({
    collection: "pages",
  })
  console.log("PAGES IN DB:", JSON.stringify(res.docs, null, 2))
  process.exit(0)
}

run().catch(err => {
  console.error("Error during query:", err)
  process.exit(1)
})
