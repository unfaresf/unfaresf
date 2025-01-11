import { defineCronHandler } from '#nuxt/cron'

export default defineCronHandler('everyTwoMinutes', () => {
  // get @unfare tweets with https://github.com/the-convocation/twitter-scraper
  // insert in "reports" table, making sure to omit already retrieved tweets. use reports.source_unq_idx
});