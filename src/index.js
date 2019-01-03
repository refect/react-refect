import React, { Component } from 'react';
import PropTypes from 'prop-types';
import hoistStatics from 'hoist-non-react-statics';
import { Provider } from 'react-redux';
import configureRefect, { createRefectStore } from 'refect';
import { get, is } from 'refect/utils';
import { ReactReduxContext } from 'react-redux';

const storeShape = PropTypes.shape({
  subscribe: PropTypes.func.isRequired,
  dispatch: PropTypes.func.isRequired,
  getState: PropTypes.func.isRequired,
});

function defaultMapStateToProps(state, props) {
  return { ...state, ...props };
}

function getNamespace(parentNamespace, namespace) {
  if (!parentNamespace) {
    return namespace;
  }

  return `${parentNamespace}.${namespace}`;
}

function shallowEqual(a, b) {
  /* eslint-disable no-restricted-syntax */
  for (const key in a) {
    if ({}.hasOwnProperty.call(a, key) && (!{}.hasOwnProperty.call(b, key) || a[key] !== b[key])) {
      return false;
    }
  }

  for (const key in b) {
    if ({}.hasOwnProperty.call(b, key) && !{}.hasOwnProperty.call(a, key)) {
      return false;
    }
  }

  return true;
}

export default function refect(options) {
  const { mapStateToProps = defaultMapStateToProps, view, initialState,
    defaultProps = {} } = options;

  class ContextWrapper extends Component {
    render() {
      return (
        <ReactReduxContext.Consumer>
          {(context) => <RefectComponent {...this.props} context={context}/>}
        </ReactReduxContext.Consumer>
      )
    }
  }

  class RefectComponent extends Component {
    static propTypes = {
      namespace: PropTypes.string,
    };

    static defaultProps = {
      namespace: options.defaultNamespace,
      ...defaultProps,
    };

    static uuid = Math.random();

    static options = options.options;

    constructor(props) {
      super(props);
      const context = props.context;
      const parentNamespace = context.namespace || '';
      this.store = context.store;

      this.state = {
        storeState: initialState,
        storeAllState: this.store.getState(),
      };

      this.namespace = getNamespace(parentNamespace, props.namespace);
    }

    componentWillMount() {
      this.actions = configureRefect({
        options,
        namespace: this.namespace,
        store: this.store,
        uuid: RefectComponent.uuid,
      });

      if (this.actions.willMount) {
        this.actions.willMount(this.props);
      }
    }

    componentDidMount() {
      this.unSubscribe = this.store.subscribe(() => {
        const storeAllState = this.store.getState();
        const storeState = get(storeAllState, this.namespace);

        this.setState({
          storeState,
          storeAllState,
        });
      });

      if (this.actions.mount) {
        this.actions.mount(this.props);
      }
    }

    shouldComponentUpdate(props, state) {
      const finalProps = mapStateToProps(state.storeState, props, state.storeAllState);
      const thisFinalProps = mapStateToProps(this.state.storeState,
        this.props, this.state.storeAllState);

      return !shallowEqual(finalProps, thisFinalProps);
    }

    componentWillUnmount() {
      const actions = this.actions;

      this.unSubscribe();

      if (this.actions.unMount) {
        this.actions.unMount(this.props);
      }
    }

    render() {
      const { storeState, storeAllState } = this.state;

      const finalProps = {
        ...mapStateToProps(storeState, this.props, storeAllState),
        actions: this.actions,
        dispatch: this.store.dispatch,
      };

      return React.createElement(view, finalProps);
    }
  }

  const wrappedComponentName = view.displayName || view.name || 'Component';

  ContextWrapper.displayName = `Refect(${wrappedComponentName})`;

  return hoistStatics(ContextWrapper, view);
}

export function refectRoot(options) {
  function RefectRootComponent(props) {
    const { children, ...rest } = props;
    const store = createRefectStore({
      ...options,
      ...rest,
    });

    return (
      <Provider store={store} >
        {children}
      </Provider>
    );
  }

  return RefectRootComponent;
}

