/* eslint-disable import/prefer-default-export */

// CSS loading ----------------------------------------------------------------

import 'font-awesome/css/font-awesome.css';
import 'normalize.css';
import 'babel-polyfill';

// Global import --------------------------------------------------------------

import React    from 'react';
import ReactDOM from 'react-dom';

import GenericViewer      from 'paraviewweb/src/React/Viewers/ImageBuilderViewer';
import QueryDataModel     from 'paraviewweb/src/IO/Core/QueryDataModel';
import LookupTableManager from 'paraviewweb/src/Common/Core/LookupTableManager';

import ImageQueryDataModelViewer from 'arctic-viewer/lib/types/ImageQueryDataModel';
import SortedCompositeViewer     from 'arctic-viewer/lib/types/SortedComposite';

// Resource images -----------------------------------------------------------

import link from './tomvizLink.png';

// Global variables -----------------------------------------------------------

const iOS = /iPad|iPhone|iPod/.test(window.navigator.platform);
const lookupTableManager = new LookupTableManager();
const dataViewers = [
  ImageQueryDataModelViewer,
  SortedCompositeViewer,
];

// Add class to body if iOS device --------------------------------------------

if (iOS) {
  document.querySelector('body').classList.add('is-ios-device');
}

// ----------------------------------------------------------------------------

function viewerBuilder(basepath, data, config, callback) {
  var foundViewer = false;
  var viewerCount = dataViewers.length;

  const dataType = data.type;
  const viewer = {
    ui: 'GenericViewer',
    config,
    allowMagicLens: true,
  };

  // Initializer shared variables
  config.lookupTableManager = lookupTableManager;

  // Update background if available
  if (data && data.metadata && data.metadata.backgroundColor) {
    viewer.bgColor = data.metadata.backgroundColor;
  }

  // Update QueryDataModel if needed
  if (dataType.indexOf('tonic-query-data-model') !== -1) {
    viewer.queryDataModel = config.queryDataModel || new QueryDataModel(data, basepath);
  }

  // Find the right viewer and build it
  const args = { basepath, data, callback, viewer, dataType };
  while (viewerCount && !foundViewer) {
    viewerCount -= 1;
    foundViewer = dataViewers[viewerCount](args);
  }

  setImmediate(() => callback(viewer));
  return foundViewer;
}

// ----------------------------------------------------------------------------

function createUI(viewer, container, callback) {
  if (viewer.bgColor && viewer.ui !== 'MultiViewerWidget') {
    container.style[(viewer.bgColor.indexOf('gradient') !== -1) ? 'background' : 'background-color'] = viewer.bgColor;
  }

  // Make sure we trigger a render when the UI is mounted
  setImmediate(() => {
    var renderers = viewer.renderers || {};
    Object.keys(renderers).forEach((name) => {
      if (renderers[name].builder && renderers[name].builder.update) {
        renderers[name].builder.update();
      }
    });
    if (viewer.imageBuilder && viewer.imageBuilder.update) {
      viewer.imageBuilder.update();
    }
  });

  // Unmount any previously mounted React component
  ReactDOM.unmountComponentAtNode(container);

  if (viewer.ui === 'ReactComponent') {
    ReactDOM.render(viewer.component, container, callback);
  } else {
    ReactDOM.render(React.createElement(GenericViewer, viewer), container, callback);
  }
}


// Expose viewer factory method -----------------------------------------------

export function load(container) {
  const rootQueryDataModel = new QueryDataModel({
    type: [],
    arguments: {},
    data: [
      {
        name: '_',
        pattern: 'data/index.json',
        type: 'json',
      },
    ],
    arguments_order: [],
    metadata: {},
  }, '');

  rootQueryDataModel.onDataChange((json) => {
    viewerBuilder('data/', json._.data, {}, (viewer) => {
      if (!viewer) {
        /* eslint-disable no-alert */
        alert('The metadata format seems to be unsupported.');
        /* eslint-enable no-alert */
        return;
      }
      createUI(viewer, container);
    });
  });
  rootQueryDataModel.useHtmlContent();
  rootQueryDataModel.fetchData();
}

// Be ready for file drop -----------------------------------------------------
const container = document.querySelector('.react-content');

const bodyStyle = document.querySelector('body').style;
bodyStyle.position = 'absolute';
bodyStyle.width = '100vw';
bodyStyle.height = '100vh';

const linkImageSelector = document.querySelector('.linkImage');
linkImageSelector.src = link;

export function ready() {
  load(container);
}

global.ready = ready;
