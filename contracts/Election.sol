pragma solidity ^0.5.0;

contract Election {
    // Model a Candidate
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    address public owner; //admin
    address[] public listAddress;
    uint256 public countVoters;

    // Store accounts that have voted
    mapping(address => bool) public voters;

    // Read/write candidates
    mapping(uint256 => Candidate) public candidates;

    // Store Candidates Count
    uint256 public candidatesCount;

    // Store adresses accounts
    mapping(address => bool) public addresses;

    // Create Book Of Voters
    mapping(address => bool) public bookOfVoters;

    bool public settingTime = false;
    uint256 public startTime;
    uint256 public endTime;

    event votedEvent(uint256 indexed _candidateId);

    constructor() public {
        owner = msg.sender;

        addCandidate("Bibi");
        addCandidate("Gantz");
    }

    modifier onlyOwner() {
        require((msg.sender == owner), "ERROR");
        _;
    }

    function vote(uint256 _candidateId) public {
        // require that they haven't voted before
        require((!voters[msg.sender]), "Error");

        // require a valid candidate
        require((_candidateId > 0 && _candidateId <= candidatesCount), "Error");

        // record that voter has voted
        voters[msg.sender] = true;

        //add voter addres to list
        listAddress.push(msg.sender);
        countVoters++;

        // update candidate vote Count
        candidates[_candidateId].voteCount++;

        // trigger voted event
        emit votedEvent(_candidateId);
    }

    function addCandidate(string memory _name) public onlyOwner {
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
    }

    function BookOfVotes(address _voterAddres) public onlyOwner {
        bookOfVoters[_voterAddres] = true;
    }

    function settingTimes(uint256 _startTime, uint256 _endTime)
        public
        onlyOwner
    {
        settingTime = true;
        startTime = _startTime;
        endTime = _endTime;
    }
}