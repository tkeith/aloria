// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Aloria {
    struct Request {
        uint256 id;
        string task;
    }

    Request[] public requests;

    event RequestStarted(uint256 requestId, string task, address promptOwner);

    function startRequest(string memory task) public payable {
        // transfer 1 satoshi from the caller to the contract
        require(msg.value == 1, "Must send 1 satoshi to start a request");
        uint256 requestId = requests.length;
        requests.push(Request(requestId, task));
        emit RequestStarted(requestId, task, msg.sender);
    }

    function startRequestFromOwnedPrompt(string memory task, address payable promptOwner) public payable {
        // transfer 1 satoshi from the caller to the contract
        require(msg.value == 2, "Must send 2 satoshis to start a request with an owned prompt");
        // transfer 1 satoshi from the prompt owner to the contract
        require(promptOwner.send(1), "Failed to send 1 satoshi to the prompt owner");
        uint256 requestId = requests.length;
        requests.push(Request(requestId, task));
        emit RequestStarted(requestId, task, promptOwner);
    }

    mapping(address => uint256) public unblockerBountyByAddress;

    event UnblockerBountyPosted(address indexed poster, uint256 amount);

    function postUnblockerBounty() public payable {
        require(msg.value > 0, "Bounty amount must be greater than 0");
        unblockerBountyByAddress[msg.sender] += msg.value;
        emit UnblockerBountyPosted(msg.sender, msg.value);
    }
}
