
module.exports = (chai, server) => {
 return {

     addActivity : (userId, caseId, activity, forename = 'x', surname = 'y') =>
        chai.request(server)
            .post(`/cases/${caseId}/activity`)
            .set('Authorization', JSON.stringify({ id: userId, forename, surname }))
            .send({
              activity,
            })
 }
}