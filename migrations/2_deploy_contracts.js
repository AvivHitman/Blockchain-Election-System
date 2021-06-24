var TokenElection = artifacts.require("./TokenElection.sol");
var Election = artifacts.require("./Election.sol");

module.exports = function(deployer) {
  deployer.deploy(TokenElection, 1000000).then(function() {
    return deployer.deploy(Election);
  });
};