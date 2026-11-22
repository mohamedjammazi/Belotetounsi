'use strict';
module.exports = {
  PORT: Number(process.env.PORT || 8000),
  ADMIN_PASSCODE: String(process.env.ADMIN_PASSCODE || '')
};
