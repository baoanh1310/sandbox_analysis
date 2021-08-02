const puppeteer = require("puppeteer");
const fs = require("fs");
const { Parser } = require("json2csv");
const prompt = require('prompt-sync')();

const URL = 'https://www.sputnik.fund/#/dao/sandbox.sputnikdao.near';

const months = {1: 'jan', 2: 'feb', 3: 'mar', 4: 'apr', 5: 'may',
                6: 'jun', 7: 'jul', 8: 'aug', 9: 'sep', 10: 'oct',
                11: 'nov', 12: 'dec'};

async function getInput() {
  let month = 0;
  while (month < 1 || month > 12) {
    month = await Number(prompt("Enter month (1-12): "));
    if (month < 1 || month > 12) {
      console.log("Month input must between 1 and 12");
    }
  }
  let year = 2020;
  while (year < 2021) {
    year = await Number(prompt("Enter year: "));
    if (year < 2021) {
      console.log("Year input must be greater or equal to 2021");
    }
  }
  return {month: month, year: year};
}

async function app() {
  console.time('Time');
  // let d = await new Date();
  // let m = await d.getMonth() + 1;
  let input = await getInput();
  let m = input.month;
  let y = input.year;
  let key = y.toString() + "-" + m.toString();
  let endValue = -1;
  let month = months[m];
  console.log("Choosen month: ", m);
  console.log("Choosen year: ", y);

  const numOfProposals = await getNumberProposals(URL);
  console.log("Number props: ", numOfProposals);

  let upperbound = numOfProposals - 1;
  let rawData = await fs.readFileSync('db.json');
  let db = JSON.parse(rawData);
  try {
    endValue = db["v2"][key];
  } catch (err) {
    console.log(err);
  }
  if (endValue > 0) {
    upperbound = endValue;
  }

  const content = [];
  for (var i = upperbound; i >= 0; i--) {
    console.log("Proposal: ", i);
    var info = await getSpecific(URL, i, month);
    if (info.isVoting) {
      content.push(info);
      continue;
    }
    if (!info.isThisMonth && info.Payout > 0) {
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

  await fs.writeFile(`./results/${month}_v2.txt`, data, (err) => {
    if (err) throw err;
    console.log('Saved!');
  });

  let fields = ['ProposalID', 'Status', 'Proposer', 'Target', 'ProposalType', 'Payout', 'TopicLink'];
  let json2csvParser = await new Parser({ fields });
  let csv = await json2csvParser.parse(content);
  await fs.writeFile(`./results/${month}_v2.csv`, csv, (err) => {
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
    let TimeStamp = "";
    try {
      TimeStamp = document.getElementsByClassName("relative-date")[0].title;
    } catch (err) {
      console.log(err);
    }
    return TimeStamp;
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
    let isVoting = false;
    let PayoutText = "";
    let Payout = 0;
    let TopicLink = "";
    let aboutSection = [];
    let TimeStamp = "";
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
      isVoting = (Status === "Voting is in progress");
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

    // get forum link and topic created TimeStampt
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

    isThisMonth = TopicLink.includes(month);

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

    return ({ProposalID, isApproved, isVoting, Status, Payout, ProposalType, TopicLink, Target, Proposer, isThisMonth});
  }, month, id);

  await browser.close();

  return result;
}

app();
