const axios = require('axios');
const Dev = require('../models/Dev');
const parseStringAsArray = require('../utils/parseStringAsArray');
const {findConnections, sendMessage} = require('../websocket');
// index, show, store, update, destroy

module.exports = {

  async index(req, res) {
    const devs = await Dev.find();
    return res.json(devs);
  },

  async store(req, res) {
    const {github_username, techs, latitude, longitude} =  req.body;

    let dev = await Dev.findOne({ github_username })

    if(!dev) {

      const response = await axios.get(`https://api.github.com/users/${github_username}`);
      const {name = login, avatar_url, bio} = response.data;
      const techsArray = parseStringAsArray(techs);
    
      const location = {
        type: 'Point',
        coordinates: [longitude, latitude],
      };
      dev = await Dev.create({
        github_username,
        name,
        avatar_url,
        bio,
        techs: techsArray,
        location
      });

      const sendSocketMessageTo = findConnections(
        {latitude, longitude}, 
        techsArray,
        );
        sendMessage(sendSocketMessageTo, 'new-dev', dev);
    }
    
    return res.json(dev);
  },

  async update(req, res) {
    
    const {github_username, techs, latitude, longitude} =  req.body;
    
    const techsArray = parseStringAsArray(techs);
    
    const location = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };

    dev = await Dev.findOneAndUpdate({github_username},{techs: techsArray, location},  { upsert: false, new: true }).exec();

    if(!dev){
      return res.status(404).send('Not Found');
    }
    
    return res.json(dev);
  },

  async destroy(req, res) {
    const {github_username} =  req.body;
    const {deletedCount} = await Dev.deleteOne({github_username});
    
    if(deletedCount <= 0) {
      return res.status(404).send('Not Found');
    }

    return res.json({'dev_user_deleted': github_username});
    
  }

};