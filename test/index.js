'use strict';

const Assert = require('assert');
const Path = require('path');
const createProvider = require('..');

describe(__filename, () => {
    it('should create a provider without locations and use only in-line', async () => {
        const createContext = await createProvider();

        const ctx = await createContext({
            functions: {
                actions: {
                    foo() {
                        return 'hello';
                    }
                }
            }
        });

        Assert.equal('hello', await ctx.actions.foo());
    });

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
            {
                source: 'path:fixtures/app/src/actions',
                filter: filePath => /foo\.js$/.test(filePath)
            },
            {
                source: 'path:fixtures/app/src/other-actions',
                filter: 'path:fixtures/app/src/bar-filter'
            },
            {
                source: 'path:fixtures/app/src/actions',
                filter: 'regexp:rfv\\.js$'
            }
        ], {
            baseDir: __dirname
        });

        const context = await createContext();
        Assert.ok(!context.controllers);
        Assert.ok(context.domain1);
        Assert.ok(context.domain2);
        Assert.ok(!context.domain3);
        Assert.ok(context.domain1.foo);
        Assert.ok(context.domain1.bar);
        Assert.ok(context.domain2.rfv);
        Assert.equal('hello from foo', context.domain1.foo());
        Assert.equal('hello from bar (other actions)', context.domain1.bar());
        Assert.equal('hello from rfv', context.domain2.rfv());
    });

    it('should filter out files from actions, using cwd', async () => {
        const createContext = await createProvider([
            {
                source: 'path:test/fixtures/app/src/actions',
                filter: filePath => /foo\.js$/.test(filePath)
            },
            {
                source: 'path:test/fixtures/app/src/other-actions',
                filter: 'path:test/fixtures/app/src/bar-filter'
            },
            {
                source: 'path:test/fixtures/app/src/actions',
                filter: 'regexp:rfv\\.js$'
            }
        ]);

        const context = await createContext();
        Assert.ok(!context.controllers);
        Assert.ok(context.domain1);
        Assert.ok(context.domain2);
        Assert.ok(!context.domain3);
        Assert.ok(context.domain1.foo);
        Assert.ok(context.domain1.bar);
        Assert.ok(context.domain2.rfv);
        Assert.equal('hello from foo', context.domain1.foo());
        Assert.equal('hello from bar (other actions)', context.domain1.bar());
        Assert.equal('hello from rfv', context.domain2.rfv());
    });

    it('should resolve path/require in in-line options passed to context creation method', async () => {
        let createContext = await createProvider();

        let ctx = await createContext({
            functions: {
                actions: {
                    foo() {
                        return 'hello';
                    }
                }
            }
        });

        Assert.equal('hello', await ctx.actions.foo());

        createContext = await createProvider();

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