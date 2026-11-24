const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:'./tests',timeout:45000,use:{headless:true,channel:process.env.NOTEMAKER_BROWSER_CHANNEL||undefined,viewport:{width:1440,height:1000}},workers:1,reporter:'list'});
