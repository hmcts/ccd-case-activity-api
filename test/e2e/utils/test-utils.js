
module.exports = (chai, server) => {
 return {

     addActivity : (userId, caseId, activity, forename = 'x', surname = 'y') =>
        chai.request(server)
            .post(`/cases/${caseId}/activity`)
            .set('Authorization', JSON.stringify({ uid: userId, given_name: forename, family_name: surname }))
            .send({
              activity,
            })
 }
}
