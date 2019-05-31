'use strict'

module.exports = context => {
    return Promise.all([
        context.domain1.foo(),
        context.domain1.qaz(),
        context.domain1.bar(),
        context.domain2.edc(),
        context.domain2.rfv(),
        context.domain3.wsx()
    ]);
};