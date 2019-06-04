'use strict';

const Fs = require('fs');
const Path = require('path');
const { promisify } = require('util');
const Handlers = require('shortstop-handlers');
const Shortstop = require('shortstop');
const defaultsDeep = require('lodash.defaultsdeep');

const stat = promisify(Fs.stat);
const readdir = promisify(Fs.readdir);
const fileExists = promisify(Fs.exists);

module.exports = async (locations, options = {}) => {
    const {
        contextContext = require('oja/context'), // better way to inject their version of oja/context
        baseDir = process.cwd(),
        fileFilter = () => true,
        functions
    } = options;

    // eslint-disable-next-line no-param-reassign
    const resolver = Shortstop.create();
    resolver.use('path', Handlers.path(baseDir));
    resolver.use('regexp', expStr => {
        const exp = new RegExp(expStr);
        return context => exp.test(context);
    });

    let discoveredActions = {};
    if (locations) {
        locations = await promisify(resolver.resolve.bind(resolver))(locations);
        const actions = await resolveActions();
        discoveredActions = {
            functions: actions
        };
    }

    return config => contextContext(
        defaultsDeep({}, config, { functions }, discoveredActions));

    async function resolveActions() {
        const result = {};

        // collect domains
        const locationDomains = await Promise.all(locations.map(async location => {
            const domains = await getDomains(location);
            return {
                location, domains
            };
        }));
        // discover action files
        // here we will keep the order of locations to let subsequent locations override the former
        for (let index = 0; index < locationDomains.length; index++) {
            const { location, domains } = locationDomains[index];
            await Promise.all(domains.map(async domain => {
                const acts = await getActions(domain.path, location.filter);
                const domainName = domain.name;

                if (acts.length) {
                    acts.forEach(act => {
                        const actName = act.name.substring(0, act.name.lastIndexOf('.')) || act.name;
                        result[domainName] = result[domainName] || {};
                        result[domainName][actName] = createLazyAction(act.path);
                    });
                }
            }));
        }
        return result;
    }

    function getDomains(location) {
        return getFiles(location.source || location, async filePath => !(await stat(filePath)).isFile());
    }

    function getActions(domainPath, filter) {
        filter = filter && (typeof filter === 'string' ?
            require(filter) : // resolve function filter
            filter) || // regexp
            defaultFilter; // default

        return getFiles(domainPath, filter);

        async function defaultFilter(filePath) {
            let fileStat = await stat(filePath);
            if (!fileStat.isFile() && await fileExists(Path.join(filePath, 'index.js'))) {
                fileStat = await stat(Path.join(filePath, 'index.js'));
            }
            return fileStat.isFile() && await fileFilter(filePath);
        }
    }

    async function getFiles(location, filter) {
        const files = [];
        // read files under given folder
        const filesNames = await readdir(location);
        for (let fileIndex = 0; fileIndex < filesNames.length; fileIndex++) {
            const fileName = filesNames[fileIndex];
            const filePath = Path.join(location, fileName);
            // and if they pass fileFilter
            if (await filter(filePath)) {
                files.push({
                    name: fileName,
                    path: filePath
                });
            }
        }
        return files;
    }
};

function createLazyAction(path) {
    let act;
    return context => {
        act = act || require(path);
        return act(context);
    };
}
