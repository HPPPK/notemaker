const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:'./tests',timeout:30000,use:{headless:true,channel:process.env.NOTEMAKER_BROWSER_CHANNEL||undefined,viewport:{width:1440,height:1000}},webServer:{command:'python -m http.server 8873 --bind 127.0.0.1',url:'http://127.0.0.1:8873',reuseExistingServer:false},workers:1,reporter:'list'});
