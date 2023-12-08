const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'covid19India.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error at ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const convertStateDbObjectToResponseDbObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

const convertDistrictDbObjectToResponseDbObject = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

app.get('/states/', async (request, response) => {
  const getStateQuery = `
    SELECT * FROM state;
    `
  const stateArray = await db.all(getStateQuery)
  response.send(
    stateArray.map(eachState =>
      convertStateDbObjectToResponseDbObject(eachState),
    ),
  )
})

//2nd Returns a state based on the state ID
app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `
  SELECT * FROM state WHERE state_id = ${stateId};
  `
  const state = await db.get(getStateQuery)
  // console.log(state)
  response.send(convertStateDbObjectToResponseDbObject(state))
})

//3rd Create a district in the district table, district_id is auto-incremented
app.post('/districts/', async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const postDistrictQuery = `
  INSERT INTO 
  district (district_name, state_id, cases, cured, active, deaths)
  VALUES 
  (
    '${districtName}',
    '${stateId}',
    '${cases}',
    '${cured}',
    '${active}',
    '${deaths}'
  );
  `
  await db.run(postDistrictQuery)
  response.send('District Successfully Added')
})

//4th Returns a district based on the district ID

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictQuery = `
  SELECT * FROM district WHERE district_id = '${districtId}';
  `
  const district = await db.get(getDistrictQuery)
  response.send(convertDistrictDbObjectToResponseDbObject(district))
})

//5th Deletes a district from the district table based on the district ID

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteDistrictQuery = `
  DELETE FROM district WHERE district_id = '${districtId}'
  `
  await db.run(deleteDistrictQuery)
  response.send('District Removed')
})

//6th Updates the details of a specific district based on the district ID

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const putDistrictQuery = `
  UPDATE  
  district 
  SET
  district_name= '${districtName}', 
  state_id = '${stateId}',
  cases='${cases}',
  cured='${cured}', 
  active='${active}', 
  deaths = '${deaths}';
  `
  await db.run(putDistrictQuery)
  response.send('District Details Updated')
})

//7th Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID
app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStatsQuery = `
  SELECT
    SUM(cases) as totalCases,
    SUM(cured) as totalCured,
    SUM(active) as totalActive,
    SUM(deaths) as totalDeaths
  FROM 
    district
  WHERE 
  state_id = '${stateId}';
  `
  const stats = await db.get(getStatsQuery)
  console.log(stats)
  // response.send({
  //   totalCases: stats['SUM(cases)'],
  //   totalCured: stats['SUM(cured)'],
  //   totalActive: stats['SUM(active)'],
  //   totalDeaths: stats['SUM(deaths)'],
  // })
  response.send(stats)
})

//8th Returns an object containing the state name of a district based on the district ID

// app.get('/districts/:districtId/details/', async (request, response) => {
//   const {districtId} = request.params
//   const getDistrictDetailsQuery = `
//   SELECT
//   state_name AS StateName
//   FROM
//   district INNER JOIN state
//   ON district.state_id = state.state_id
//   WHERE
//   district_id = '${districtId}';
//   `
//   const stateName = await db.get(getDistrictDetailsQuery)
//   response.send(stateName)
// })

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictIdQuery = `
    SELECT state_id FROM district
    WHERE district_id = ${districtId};
    ` //With this we will get the state_id using district table
  const getDistrictIdQueryResponse = await db.get(getDistrictIdQuery)

  const getStateNameQuery = `
SELECT state_name AS stateName FROM state
WHERE state_id = ${getDistrictIdQueryResponse.state_id};
` //With this we will get state_name as stateName using the state_id
  const getStateNameQueryResponse = await db.get(getStateNameQuery)
  response.send(getStateNameQueryResponse)
}) //sending the required response

module.exports = app
