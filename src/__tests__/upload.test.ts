import { upload } from '../upload';
import axios from 'axios';
import { getURLForFile } from 'uhrp-url';
import { Buffer } from 'buffer';

jest.mock('axios');
jest.mock('uhrp-url');

global.FormData = require('form-data');

describe('upload function', () => {
  // ... (keep the original test cases)
});
