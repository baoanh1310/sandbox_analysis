import requests
from bs4 import BeautifulSoup

URL = "https://www.sputnik.fund/#/dao/sandbox.sputnikdao.near"
page = requests.get(URL)

soup = BeautifulSoup(page.content, "html5lib")
print(soup.prettify())
