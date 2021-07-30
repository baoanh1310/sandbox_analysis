# Prerequisites

- Nodejs: https://nodejs.org/en/

# Installation

Open Terminal (Powershell on Windows)

```bash
git clone https://github.com/baoanh1310/sandbox_analysis
cd sandbox_analysis
npm install
```

# Run

- Get result for version 1 (based on the exact timestamp that the topic was created on forum)
```bash
node crawler.js
```

- Get result for version 2 (based on the month info in about section link)
```bash
node crawler_v2.js
```

# Results

- The code will automatically exports 2 files in the **results** folder

- The txt extension file contains: 
  + Total reward of the month
  + Max reward of the month
  + Average reward of the month
  + Total approved proposals

- The csv extension file contains more details data scraping from DAO website
