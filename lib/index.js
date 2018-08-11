const fs = require('fs');
const async = require('async');
const moment = require('moment');
const path = require('path');
const _ = require('lodash');
const utilLib = require('./utility');

global.ROOT_PATH = path.resolve(__dirname, '../');

var generateRawData = function (input) {
    let output = {};
    return new Promise((resolve, reject) => {

        if (input.accounts && input.accounts.users && input.accounts.users.length) {
            // create accounts map
            input.accounts.users.forEach(element => {
                element.grants = [];
                element.revokes = [];
                output[element.number] = element;

            })
            //map offers to account
            _.forEach(input, (partners, key) => {
                //skip accounts data
                if (key.toLowerCase() !== 'accounts') {
                    partners.grants.forEach(grant => {
                        // if account exist and period is valid
                        if (grant.period && typeof grant.period == 'number' && output[grant.number]) {
                            let temp = {};
                            temp.partner = key;
                            temp.date = grant.date;
                            temp.timestamp = Number(moment(grant.date).format('x'));
                            temp.period = grant.period;
                            output[grant.number].grants.push(temp)
                        }
                    });
                    partners.revocations.forEach(revoke => {

                        // if account exist and number is valid
                        if (revoke.number && output[revoke.number]) {
                            let temp = {};
                            temp.partner = key;
                            temp.timestamp = Number(moment(revoke.date).format('x'));
                            temp.date = revoke.date;
                            output[revoke.number].revokes.push(temp);
                        }
                    });
                }
            })
            resolve(output);
        } else {
            let error = new Error('no accounts available')
            reject(error);
        }


    })
}
var calculateDuration = function (rawData) {
    let outputFinal = {
        "subscriptions": {}
    }
    if (typeof rawData != 'object') {
        return outputFinal;
    }

    // for each user accounnt
    _.forEach(rawData, (account, key) => {
        account.isOpen = true;
        // if there is any offer granted
        if (account.grants.length > 0) {
            // sort grants by timestamp
            account.grants.sort((a, b) => {
                return a.timestamp - b.timestamp;
            });

            // process each grant and calculate valid duration
            _.forEach(account.grants, (grant) => {
                // if no one owns the account OR
                // account is revoked by owner
                if (!account.owner || (account.owner != grant.partner && account.isOpen)) {
                    if (account.owner != grant.partner && account.isOpen) {
                        //offfer granted by partner who is not the owner of account
                        console.info(moment().toISOString() + '# changing owner of account######' + account.name, grant.partner)
                    }
                    account.owner = grant.partner;
                    account.date = grant.date;
                    account.start = grant.timestamp;
                    account.end = Number(moment(grant.date).add(grant.period, 'M').format('x'));

                    account.days = moment(account.end).diff(account.start, 'days');
                    account.isOpen = false;
                    // find revoke
                    let tempRevoke = account.revokes.find(element => {
                        return element.partner == grant.partner
                    })
                    // if partner revoked the account
                    if (tempRevoke) {
                        // if revoked before the offer period ends
                        if (tempRevoke.timestamp <= account.end && tempRevoke.timestamp >= account.start) {
                            // console.info(moment().toISOString() + "# performing revoke# " + account.name, tempRevoke.partner);
                            account.days = (moment(tempRevoke.timestamp).diff(account.start, 'days'));
                            // account is open to everyone to own 
                            account.isOpen = true;
                        }
                        //TODO
                        // what if partner revoke the offer after period ends?
                        //
                    }
                    // write to output 
                    if (!outputFinal.subscriptions['' + account.name]) {
                        outputFinal.subscriptions['' + account.name] = {};
                    }
                    outputFinal.subscriptions['' + account.name][grant.partner] = account.days;

                } else if (account.owner == grant.partner) {
                    let oldCount = account.days;
                    // console.info(moment().toISOString() + "# new offer from owner partner#" + account.name, grant.partner);
                    // partner is owner of account and grant one more offer
                    account.date = grant.date;
                    account.start = grant.timestamp <= account.end ? account.end : grant.timestamp;
                    account.end = Number(moment(account.start).add(grant.period, 'M').format('x'));
                    account.days += moment(account.end).diff(account.start, 'days');
                    account.isOpen = false;

                    // find revoke
                    let tempRevoke = account.revokes.find(element => {
                        return element.partner == grant.partner
                    })
                    // if partner revoked the account
                    if (tempRevoke) {
                        // if revoked before the offer period ends
                        if (tempRevoke.timestamp <= account.end && tempRevoke.timestamp >= account.start) {
                            // console.info(moment().toISOString() + "# performing revoke# " + account.name, tempRevoke.partner);
                            // totalduration=old + diff;
                            account.days = oldCount + (moment(tempRevoke.timestamp).diff(account.start, 'days'));
                            // account is open to everyone to own 
                            account.isOpen = true;
                        }
                        //TODO
                        // what if partner revoke the offer after period ends?

                    }
                    //write to output object
                    if (!outputFinal.subscriptions['' + account.name]) {
                        outputFinal.subscriptions['' + account.name] = {};
                    }
                    outputFinal.subscriptions['' + account.name][grant.partner] = account.days;

                } // else ignore the grant

            });

        }
    });
    return outputFinal;
}
var calculate = function () {
    let result = {};
    let fileArray = []
    // read all files in directory
    fs.readdir(ROOT_PATH + '/data', (err, files) => {
        if (err) {
            console.error(moment().toISOString() + "# Error", err)
        } else {
            files.forEach(element => {
                let elementPath = ROOT_PATH + '/data/' + element;
                let elementFname = path.parse(elementPath).name;
                //create fileArray to read files in parallel
                fileArray.push(function (cb) {
                    fs.readFile(elementPath, (err, data) => {
                        if (err) {
                            cb(err);
                        } else {
                            try {
                                result[elementFname] = JSON.parse(data);
                                cb();
                            } catch (exception) {
                                cb(exception);
                            }

                        }
                    })
                });
            });
            //process the fileArray parallel with async
            async.parallel(fileArray, function (err) {
                if (err) {
                    console.error(moment().toISOString() + "# Error", err)
                } else {
                    //step 2
                    console.info(moment().toISOString() + '# files read complete', 'done');
                    generateRawData(result).then(rawData => {
                        console.info(moment().toISOString() + "# rawdata generation", "success");
                        let output = calculateDuration(rawData);
                        fs.writeFile(ROOT_PATH + '/output/result.json', JSON.stringify(output), err => {
                            if (err) {
                                console.error(moment().toISOString() + '# error while writing output file');
                            } else {
                                console.info(moment().toISOString() + '# output file write', 'success');
                            }
                        });
                    }).catch(err => {
                        console.error(moment().toISOString() + '#Error', err);
                    })
                }
            })
        }
    })
}
calculate();

module.exports = {
    calculate,
    generateRawData,
    calculateDuration
}