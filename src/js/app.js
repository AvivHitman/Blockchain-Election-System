App = {
    web3Provider: null,
    contracts: {},
    account: '0x0',
    hasVoted: false,

    init: function () {
      return App.initWeb3();
    },

    initWeb3: function () {
      // TODO: refactor conditional
      if (typeof web3 !== 'undefined') {
        // If a web3 instance is already provided by Meta Mask.
        App.web3Provider = web3.currentProvider;
        ethereum.enable();
        web3 = new Web3(web3.currentProvider);
      } else {

        App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        web3 = new Web3(App.web3Provider);
      }
      return App.initContract();
    },

    initContract: function () {
      $.getJSON("Election.json", function (election) {
        // Instantiate a new truffle contract from the artifact
        App.contracts.Election = TruffleContract(election);
        // Connect provider to interact with contract
        App.contracts.Election.setProvider(App.web3Provider);

        $.getJSON("TokenElection.json", function (TokenElection) {
          // Instantiate a new truffle contract from the artifact
          App.contracts.TokenElection = TruffleContract(TokenElection);
          // Connect provider to interact with contract
          App.contracts.TokenElection.setProvider(App.web3Provider);

        });
        App.listenForEvents();

        return App.render();
      });
    },

    // Listen for events emitted from the contract
    listenForEvents: function () {
      App.contracts.Election.deployed().then(function (instance) {

        instance.votedEvent({}, {
          fromBlock: latest,
          // toBlock: 'latest'
        }).watch(function (error, event) {
          console.log("event triggered", event)
          // Reload when a new vote is recorded
          App.render();
        });
      });
    },

    render: async function () {
      var electionInstance;
      var loader = $("#loader");
      var content = $("#content");
      var admin = $("#admin");
      var startAdmin = $("#startAdmin");
      var candidatesResults = $('#candidatesResults')
      var win = $('#win')


      loader.show()
      startAdmin.hide()
      admin.hide()
      content.hide()
      win.hide()


      // Load account data
      web3.eth.getCoinbase(function (err, account) {
        if (err === null) {
          App.account = account;
          $("#accountAddress").html("Your Account: " + account);
        }
      });

      // Load contract data
      App.contracts.Election.deployed().then(function (instance) {
        electionInstance = instance;
        return electionInstance.candidatesCount();
      }).then(async function (candidatesCount) {
        var candidatesResults = $("#candidatesResults");
        candidatesResults.empty();

        var candidatesSelect = $('#candidatesSelect');
        candidatesSelect.empty();

        const listCadidate = []
        for (var i = 1; i <= candidatesCount; i++) {
          listCadidate.push(electionInstance.candidates(i));
        }

        const candidate = await Promise.all(listCadidate)
        candidate.sort((a, b) => {
          return b[2] - a[2]
        }).forEach((candidate, count) => {
          var id = candidate[0];
          var name = candidate[1];
          var voteCount = candidate[2];


          // Render candidate Result
          var candidateTemplate = "<tr><th>" + (count + 1) + "</th><td>" + name + "</td><td>" + voteCount + "</td></tr>"
          candidatesResults.append(candidateTemplate);

          // Render candidate ballot option
          var candidateOption = "<option value='" + id + "' >" + name + "</ option>"
          candidatesSelect.append(candidateOption);
        })

        return electionInstance.voters(App.account);
      }).then(function (hasVoted) {
        // Do not allow a user to vote
        if (hasVoted) {
          $('form').hide();
        }
        loader.hide();
        content.show();
        $('#allowVote').hide()
        return electionInstance.owner()
      }).then(function (admin_owner) {
        if (admin_owner == App.account) {
          admin.show();
          startAdmin.show()
        }
        return [electionInstance.settingTime(), electionInstance.owner(), electionInstance.startTime(), electionInstance.endTime()]
      }).then(function ([setTime, owner, start, end]) {

        Promise.resolve(setTime).then(function (settingTime) {
          if (settingTime == true) {
            startAdmin.hide()
            Promise.resolve(start).then(function (startTime) {
              var today = new Date();
              if (today.getTime() > startTime) {
                Promise.resolve(end).then(function (endTime) {
                  if (endTime > today.getTime()) {
                    content.show()
                    $('#allowVote').show()
                  } else {
                    App.contracts.Election.deployed().then(function (instance) {
                      return instance.countVoters()
                    }).then(async function (countVoters) {
                      for (var i = 0; i < countVoters; i++) {
                        await App.contracts.Election.deployed().then(function (instance) {
                          return instance.listAddress(i)
                        }).then(function (addresVoter) {
                          Promise.resolve(owner).then(async function (owner_addres) {
                            if (owner_addres == App.account) {
                              await App.contracts.TokenElection.deployed().then(function (instance) {
                                return instance.transfer(addresVoter, 1)
                              });
                            }

                          })

                        })
                      }
                    }).then(function (instance) {
                      $('#allowVote').hide();
                      $('#win').show();
                      $('#admin').hide();

                      $($(candidatesResults).children('tr').get(0)).children('td').get(1);
                      var winner = $($(candidatesResults).children('tr').get(0)).children('td').get(0).textContent;
                      document.getElementById('winner').innerHTML =
                        winner;

                    });
                  }
                })
              }
            })
          }
        })
      }).catch(function (error) {
        console.warn(error);
      });
    },

    castVote: function () {
      var candidateId = $('#candidatesSelect').val();
      App.contracts.Election.deployed().then(function (instance) {
        return instance.vote(candidateId, {
          from: App.account
        });
      }).then(function (result) {
        // Wait for votes to update
        $("#content").hide();
        $("#loader").show();
      }).catch(function (err) {
        console.error(err);
      });
    },

    addCandidates: function () {
      var name = $('#fname').val();
      App.contracts.Election.deployed().then(function (instance) {
        return instance.addCandidate(name, {
          from: App.account
        })
      }).then(() => {
        return App.render();
      }).catch(function (err) {
        console.error(err);
      });
    },


    addToVotersBook: async function () {
      var voterAddres = $('#addressText').val();
      await App.contracts.Election.deployed().then((function (instance) {
        return instance.BookOfVotes(voterAddres, {
          from: App.account
        })
      })).catch((function (err) {
        console.error(err);
      }))
    },


    addToBookVotesInputFile: function () {
      var fileInput = document.getElementById('addressFile');
      fileInput.addEventListener('change', function (e) {
        var file = fileInput.files[0];
        var reader = new FileReader();
        reader.onload = async function (event) {
          var contents = event.target.result;
          var lines = this.result.split('\n');
          for (var line = 0; line < lines.length; line++) {
            await App.contracts.Election.deployed().then((function (instance) {
              return instance.BookOfVotes(lines[line], {
                from: App.account

              })
            }))
          }
        };
        reader.readAsText(file);
      });

    },

    setElectionTimes: function () {
      var startTime = new Date($('#start').val())
      var endTime = new Date($('#end').val())

      App.contracts.Election.deployed().then(function (instance) {
        return instance.settingTimes(startTime.getTime(), endTime.getTime(), {
          from: App.account
        }).then(() => {
          return App.render();
        });
      })
    },
  },


  //timer for voting
  document.getElementById('timer').innerHTML =
  01 + ":" + 00;
startTimer();

function startTimer() {
  var presentTime = document.getElementById('timer').innerHTML;
  var timeArray = presentTime.split(/[:]+/);
  var m = timeArray[0];
  var s = checkSecond((timeArray[1] - 1));
  if (s == 59) {
    m = m - 1
  }
  if (s == 0 && m == 0) {
    document.getElementById("vote").disabled = true;
  }

  document.getElementById('timer').innerHTML =
    m + ":" + s;
  if (s != 0) {
    setTimeout(startTimer, 1000);
  }
}

function checkSecond(sec) {
  if (sec < 10 && sec >= 0) {
    sec = "0" + sec
  }; // add zero in front of numbers < 10
  if (sec < 0) {
    sec = "59"
  };
  return sec;
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});