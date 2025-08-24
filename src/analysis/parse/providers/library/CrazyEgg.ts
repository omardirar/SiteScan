// @ts-nocheck
import BaseProvider from './utils/BaseProvider.js';
/**
 * Crazy Egg
 * https://www.crazyegg.com/
 * https://developer.medallia.com/medallia-dxa/docs/introduction

 *
 * @class
 * @extends BaseProvider
 */

class CrazyEggProvider extends BaseProvider {
  constructor() {
    super();
    this._key = 'CRAZYEGG';
    this._pattern = /script\.crazyegg\.com\/pages\/scripts\//;
    this._name = 'Crazy Egg';
    this._type = 'replay';
  }

  /**
   * Retrieve the column mappings for default columns (account, event type)
   *
   * @return {{}}
   */
  get columnMapping() {
    return {
      account: '_accountID',
      requestType: 'requestTypeParsed',
    };
  }

  /**
   * Retrieve the group names & order
   *
   * @returns {*[]}
   */
  get groups() {
    return [
      {
        key: 'general',
        name: 'General',
      },
    ];
  }

  /**
   * Parse custom properties for a given URL
   *
   * @param    {string}   url
   * @param    {object}   params
   *
   * @returns {void|Array}
   */
  handleCustom(_url, _params) {
    const results = [];

    // Account info
    const accountInfo = _url.pathname.match(/\/scripts\/(\d+\/\d+)\.js/);
    if (accountInfo !== null) {
      results.push({
        key: '_accountID',
        field: 'Account ID',
        value: `${accountInfo[1].replace('/', '')}`,
        group: 'general',
      });
    }

    results.push({
      key: 'requestTypeParsed',
      field: 'Request Type',
      value: 'Library Load',
      group: 'general',
    });

    return results;
  } // handle custom
} // class

// auto-added by fix-exports.js
export default CrazyEggProvider;
