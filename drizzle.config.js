/** @type { import("drizzle-kit").Config } */
module.exports = {
  schema: "./utils/schema.js",
  dialect: 'postgresql',
  out: './migrations',
  dbCredentials: {
    url: 'postgresql://db_owner:C32nxGOJYQzt@ep-purple-cloud-a1995gda.ap-southeast-1.aws.neon.tech/db?sslmode=require',
  }
};