'use strict';

const Assert = require('assert');
const Path = require('path');
const createProvider = require('..');

describe(__filename, () => {
    it('should discover actions from a single source', async () => {
        const createContext = await createProvider([
            'path:fixtures/app/src/actions'
        ], {
            baseDir: __dirname
        });

        const context = await createContext();

        Assert.ok(!context.empty);
        Assert.ok(context.controllers);
        Assert.ok(context.controllers.account);
        Assert.ok(context.domain1);
        Assert.ok(context.domain1.foo);
        Assert.ok(context.domain1.bar);
        Assert.ok(context.domain1.qaz);
        Assert.ok(context.domain2);
        Assert.ok(context.domain2.edc);
        Assert.ok(context.domain2.rfv);
        Assert.ok(context.domain3);
        Assert.ok(context.domain3.wsx);

        // let's call them all and validate
        Assert.deepEqual([
            'hello from foo',
            'hello from qaz',
            'hello from bar',
            'hello from edc',
            'hello from rfv',
            'hello from wsx'
        ], await context.controllers.account());
    });

    it('should discover actions from multiple sources and keep an order to let later override former', async () => {
        const createContext = await createProvider([
            'path:fixtures/app/src/actions',
            'path:fixtures/app/src/other-actions'
        ], {
            baseDir: __dirname
        });

        const context = await createContext();

        Assert.ok(context.controllers);
        Assert.ok(context.controllers.account);
        Assert.ok(context.domain1);
        Assert.ok(context.domain1.foo);
        Assert.ok(context.domain1.bar);
        Assert.ok(context.domain1.qaz);
        // should merge actions found in different location under the same domain name
        Assert.ok(context.domain1.qwe);
        Assert.ok(context.domain2);
        Assert.ok(context.domain2.edc);
        Assert.ok(context.domain2.rfv);
        Assert.ok(context.domain3);
        Assert.ok(context.domain3.wsx);

        // actions should be cached
        Assert.ok(context.domain1.bar === context.domain1.bar);
        Assert.ok(context.domain1.foo === context.domain1.foo);

        // let's call them all and validate
        Assert.deepEqual([
            'hello from foo',
            'hello from qaz',
            'hello from bar (other actions)',
            'hello from edc',
            'hello from rfv',
            'hello from wsx'
        ], await context.controllers.account());

        // let's call them all and validate
        Assert.deepEqual([
            'hello from foo',
            'hello from qaz',
            'hello from bar (other actions)',
            'hello from qwe (other actions)',
            'hello from edc',
            'hello from rfv',
            'hello from wsx'
        ], await context.controllers.user());
    });

    it('should filter out files from actions', async () => {
        const createContext = await createProvider([
            'path:fixtures/app/src/actions',
            'path:fixtures/app/src/other-actions'
        ], {
            baseDir: __dirname,
            fileFilter: filePath => !/(foo|rfv|bar)\.js/.test(filePath)
        });

        const context = await createContext();

        Assert.ok(context.controllers);
        Assert.ok(context.domain1);
        Assert.ok(context.domain1.qaz);
        // should merge actions found in different location under the same domain name
        Assert.ok(context.domain1.qwe);
        Assert.ok(context.domain2);
        Assert.ok(context.domain2.edc);
        Assert.ok(context.domain3);
        Assert.ok(context.domain3.wsx);
    });

    it('should resolve path/require in in-line options passed to context creation method', async () => {
        let createContext = await createProvider({
            function: {}
        });

        let ctx = createContext();

        ctx = createContext({
            functions: {
                actions: {
                    foo() {
                        return 'hello';
                    }
                }
            }
        });

        Assert.equal('hello', await ctx.actions.foo());

        createContext = await createProvider({
            functions: {
                actions: {
                    foo() {
                        return 'hello';
                    }
                }
            }
        });

        ctx = createContext();
        Assert.equal('hello', await ctx.actions.foo());

        ctx = createContext({
            functions: {
                actions: {
                    foo() {
                        return 'hello in-line';
                    },
                    bar: 'barv'
                }
            },
            properties: {
                qaz: 'qazv'
            }
        });

        Assert.equal('hello in-line', await ctx.actions.foo());
        Assert.equal('barv', await ctx.actions.bar());
        Assert.equal('qazv', ctx.qaz);
    });
});