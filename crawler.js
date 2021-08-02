const puppeteer = require("puppeteer");
const fs = require("fs");
const { Parser } = require("json2csv");
const prompt = require('prompt-sync')();

const URL = 'https://www.sputnik.fund/#/dao/sandbox.sputnikdao.near';

const months = {1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May',
                6: 'Jun', 7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct',
                11: 'Nov', 12: 'Dec'};

async function app() {
  console.time('Time');
  // let d = await new Date();
  // let m = await d.getMonth() + 1;
  let m = await Number(prompt("Enter month (1-12): "));

  let month = months[m];
  console.log("Choosen month: ", m);

  const numOfProposals = await getNumberProposals(URL);
  console.log("Number props: ", numOfProposals);

  const content = [];
  for (var i = numOfProposals-1; i >= 0; i--) {
    console.log("Proposal: ", i);
    var info = await getSpecific(URL, i, month);
    var Timestamp = await getTimeFromForum(info.TopicLink);
    info.Timestamp = Timestamp;
    if (info.Timestamp.includes(month)) {
      info.isThisMonth = true;
    } else {
      info.isThisMonth = false;
    }
    // if (!info.isThisMonth && info.Payout > 0) {
    if (!info.isThisMonth) {
      break;
    } else {
      content.push(info);
    }
  }

  console.log(content);
  let total = 0;
  let maxReward = 0;
  let numApprove = 0;
  let avgReward = 0.0;

  let approveList = content.map(x => x.isApproved);
  numApprove = approveList.filter(x => x === true).length;
  console.log(numApprove);

  let rewards = content.map(x => x.Payout);
  rewards = rewards.filter(x => x > 0);

  maxReward = rewards[0];
  for (var i = 0; i < rewards.length; i++) {
    total += rewards[i];
    if (rewards[i] > maxReward) {
      maxReward = rewards[i];
    }
  }

  avgReward = total / rewards.length;
  avgReward = Math.round(avgReward * 100) / 100;

  console.log("Total rewards: ", total);
  console.log("Max rewards: ", maxReward);
  console.log("Average reward: ", avgReward);
  console.log("Number of Approved Proposals: ", numApprove);

  let data = `Total rewards: ${total}\nMax rewards: ${maxReward}\nAverage reward: ${avgReward}\nNumber of approved proposals: ${numApprove}`;

  await fs.writeFile(`./results/${month}_v1.txt`, data, (err) => {
    if (err) throw err;
    console.log('Saved!');
  });

  let fields = ['ProposalID', 'Status', 'Proposer', 'Target', 'ProposalType', 'Payout', 'Timestamp', 'TopicLink'];
  let json2csvParser = await new Parser({ fields });
  let csv = await json2csvParser.parse(content);
  await fs.writeFile(`./results/${month}_v1.csv`, csv, (err) => {
    if (err) throw err;
    console.log('CSV Saved!');
  });
  

  console.timeEnd('Time');
}

async function getTimeFromForum(url) {
  let browser = await puppeteer.launch({ headless: true, timeout: 0 });
  let page = await browser.newPage();
  await page.goto(url, {timeout: 0});

  let result = await page.evaluate(() => {
    let Timestamp = "";
    try {
      Timestamp = document.getElementsByClassName("relative-date")[0].title;
    } catch (err) {
      console.log(err);
    }
    return Timestamp;
  });

  await browser.close();
  return result;
}

async function getNumberProposals(url) {
  let browser = await puppeteer.launch({ headless: true, timeout: 0 });
  let page = await browser.newPage();
  await page.goto(url, {timeout: 0});

  let result = await page.evaluate(() => {
    let numberPropsText = document.getElementsByTagName("main")[0].childNodes[0].childNodes[0].childNodes[1].childNodes[1].childNodes[0].childNodes[0].childNodes[1].getElementsByTagName("span")[0].innerText.replace("(", "").replace(")", "");
    let numberProps =  parseInt(numberPropsText);
    return numberProps;
  });

  await browser.close();
  return result;
}

async function getSpecific(url, id, month) {
  let browser = await puppeteer.launch({ headless: true, timeout: 0 });
  let page = await browser.newPage();
  let specificURL = url + "/proposals/" + id.toString();
  await page.goto(specificURL, {timeout: 0});

  let result = await page.evaluate((month, id) => {
    let ProposalID = id;
    let Status = "";
    let isApproved = false;
    let PayoutText = "";
    let Payout = 0;
    let TopicLink = "";
    let aboutSection = [];
    let Timestamp = "";
    let isThisMonth = true;
    let isPayout = false;
    let ProposalType = "";
    let Target = "";
    let Proposer = "";

    // get "Payout" or not
    try {
      ProposalType = document.getElementsByTagName("main")[0].childNodes[0].childNodes[0].childNodes[2].childNodes[0].childNodes[0].innerText;
      isPayout = (ProposalType === "Payout");
    } catch (err) {
      console.log(err);
    }

    // get "Approved" or not
    try {
      Status = document.getElementsByTagName("main")[0].childNodes[0].childNodes[0].childNodes[1].childNodes[0].childNodes[1].innerText;
      isApproved = (Status === "Approved");
    } catch (err) {
      console.log(err);
    }

    // get payout in NEAR
    try {
      PayoutText = document.getElementsByTagName("main")[0].getElementsByTagName("section")[0].getElementsByTagName("div")[0].getElementsByTagName("div")[5].childNodes[1].childNodes[2].childNodes[1].childNodes[1].innerText;
      Payout = parseFloat(PayoutText);
    } catch (err) {
      console.log(err);
    }

    // get forum link and topic created Timestamp
    try {
      aboutSection = document.getElementsByTagName("main")[0].childNodes[0].childNodes[0].childNodes[3].childNodes[0].childNodes[1].innerText.split("\n\n");
      if (aboutSection[0].startsWith("https://gov.near.org")) {
        TopicLink = aboutSection[0];
      } else {
        TopicLink = aboutSection[1];
      }
    } catch (err) {
      console.log(err);
    }

    // get target
    try {
      Target = document.getElementsByTagName("main")[0].getElementsByTagName("section")[0].childNodes[0].childNodes[2].childNodes[1].childNodes[0].childNodes[1].innerText;
    } catch (err) {
      console.log(err);
    }

    // get proposer
    try {
      Proposer = document.getElementsByTagName("main")[0].getElementsByTagName("section")[0].childNodes[0].childNodes[2].childNodes[1].childNodes[1].childNodes[1].innerText;
    } catch (err) {
      console.log(err);
    }

    return ({ProposalID, isApproved, Status, Payout, ProposalType, TopicLink, Target, Proposer, Timestamp});
  }, month, id);

  await browser.close();

  return result;
}

app();
