import puppeteer from "puppeteer";
import * as cheerio from 'cheerio';
import axios from "axios";
import {HttpsProxyAgent} from 'https-proxy-agent';

const ports = ['30002', '30003', '30004', '30005', '30006', '30007', '30008', '30010'];
const randomNum = Math.floor(Math.random() * ports.length);
const username = process.env.SMART_PROXY_USERNAME
const password = process.env.SMART_PROXY_PASS
const url2 = 'http://httpbin.org/ip'
const ipAddress = ''

async function setupBrowser() {
    const proxyUrl = `https=gb.smartproxy.com:${ports[randomNum]}`
    const ip = await getIp();
    console.log(ip + ':' + ports[randomNum]);
    console.log(proxyUrl)

    return await puppeteer.launch({
        headless: false,
        args: [
            `--proxy-server=${proxyUrl}`,
            '--start-maximized'
        ]
    })
}

async function confirmProxySetup(page) {
    await page.goto('http://ifconfig.me')
    await page.authenticate({username: username, password: password});
    let source = await page.content();
    if (source.includes(ipAddress)) {
        throw new Error('Proxy not set correctly');
    }
}

async function scrapeData(page, startNum) {
    const job_search_term = "qa+engineer+jobs"
    const url = `https://www.google.com/search?q=${job_search_term}&start=${startNum}`

    await page.setViewport({width: 1920, height: 1080});
    await page.goto(url)
    const rejectButton = await page.$x('//*[text()="Reject all"]');

    await Promise.all([
        rejectButton[0].click(),
        page.waitForNavigation(),
    ]);

    const pageSource = await page.content()
    let $ = cheerio.load(pageSource)
    const job_listings = $('div.PwjeAc')
    job_listings.each(function (i) {
        const linkToJob = $('div[data-share-url]').eq(i - 1).attr('data-share-url')
        const jobTitle = $(this).find('div.BjJfJf').text()
        const hiringCompany = $(this).find('div.vNEEBe').text()
        const location = $(this).find('div.Qk80Jf').eq(0).text()
        const jobSite = $(this).find('div.Qk80Jf').eq(1).text()
        const postTime = $(this).find('span[aria-label]').eq(0).text()
        const salary = $(this).find('span[aria-label]').eq(1).text()
        const jobDescription = $('span.HBvzbc').eq(i - 1).text().toLowerCase()
        let allJobInfo = [jobTitle, hiringCompany, location, jobSite, postTime, salary, linkToJob];

        allJobInfo = removeEmpty(allJobInfo)
        if (jobDescription.includes('python')) {

            console.log(allJobInfo)
        }
    })
}

async function getIp(){
    const url = 'https://ip.smartproxy.com/json';
    const proxyAgent = new HttpsProxyAgent(
        `http://${username}:${password}@gate.smartproxy.com:${ports[randomNum]}`);

    return axios.get(url, {
        httpsAgent: proxyAgent
    }).then((response) => {
            return response.data.proxy.ip
        });

}

function removeEmpty (values) {
    for(const element of values) {
        if(typeof element == 'string' && element.length === 0) {
            const index = values.indexOf(element);
            const x = values.splice(index, 1)
        }
    }
    return values
}


async function main() {
    let x = -10
    const browser = await setupBrowser();
    const [page] = await browser.pages();
    await page.authenticate({username: username, password: password});
    await confirmProxySetup(page)

    while (x < 30) {
        x += 10
        await scrapeData(page, x);
    }
    await browser.close()
} main()