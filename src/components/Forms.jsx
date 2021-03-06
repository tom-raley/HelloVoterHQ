import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import ReactPaginate from 'react-paginate';
import Select from 'react-select';
import t from 'tcomb-form';

import CircularProgress from '@material-ui/core/CircularProgress';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';

import {
  faTimesCircle,
  faClipboard
} from '@fortawesome/free-solid-svg-icons';

import { CardVolunteer } from './Volunteers.jsx';
import { CardTeam } from './Teams.jsx';

import {
  API_BASE_URI,
  _fetch,
  notify_error,
  notify_success,
  _handleSelectChange,
  _searchStringify,
  _loadForms,
  _loadForm,
  _loadAttributes,
  _loadVolunteers,
  _loadTeams,
  RootLoader,
  Icon,
  DialogSaving
} from '../common.js';

const FTYPE = t.enums(
  {
    String: 'Text Input',
    TEXTBOX: 'Large Text Box',
    Number: 'Number',
    Boolean: 'On/Off Switch',
    SAND: 'Agree/Disagree'
    //  'List': 'Select from List',
  },
  'FTYPE'
);

var addItem = {
  key: t.String,
  label: t.String,
  type: FTYPE
};

export default class Forms extends Component {
  constructor(props) {
    super(props);

    let perPage = localStorage.getItem('formsperpage');
    if (!perPage) perPage = 5;

    // TODO: this is only for brand new forms
    let fields = {};
    let order = Object.keys(fields);
    this.mainForm = t.struct({
      name: t.String
    });

    this.state = {
      loading: true,
      forms: [],
      attributes: [],
      fields: fields,
      order: order,
      customForm: null,
      search: '',
      perPage: perPage,
      pageNum: 1,
      menuDelete: false
    };

    this.formServerItems = t.struct({
      name: t.String
    });

    this.customFormItems = t.struct(addItem);

    this.formServerOptions = {
      fields: {
        name: {
          label: 'Form Name',
          error: 'You must enter a form name.'
        }
      }
    };

    this.onChange = this.onChange.bind(this);
    this.onTypeSearch = this.onTypeSearch.bind(this);
    this.handlePageNumChange = this.handlePageNumChange.bind(this);
  }

  handleClickDelete = () => {
    this.setState({ menuDelete: true });
  };

  handleCloseDelete = () => {
    this.setState({ menuDelete: false });
  };

  handlePageNumChange(obj) {
    localStorage.setItem('volunteersperpage', obj.value);
    this.setState({ pageNum: 1, perPage: obj.value });
  }

  handlePageClick = data => {
    this.setState({ pageNum: data.selected + 1 });
  };

  onTypeSearch(event) {
    this.setState({
      search: event.target.value.toLowerCase(),
      pageNum: 1
    });
  }

  inputTypeToReadable(type) {
    switch (type) {
    case 'String':
      return 'Text Input';
    case 'TEXTBOX':
      return 'Text Box';
    case 'Number':
      return 'Number';
    case 'Boolean':
      return 'On/Off Switch';
    case 'SAND':
      return 'Agree/Disagree';
    case 'List':
      return 'Select from List';
    default:
      return type;
    }
  }

  rmField(obj) {
    let { fields, order } = this.state;
    for (let f in fields) {
      if (fields[f] === obj) {
        delete fields[f];
        order.splice(order.indexOf(f), 1);
      }
    }
    this.setState({ fields, order });
    this.forceUpdate();
  }

  onChange(value) {
    if (value.type === 'List') value = t.String; // do something...
  }

  onChangeForm(addFormForm) {
    this.setState({ addFormForm });
  }

  componentDidMount() {
    this._loadData();
  }

  _loadData = async () => {
    this.setState({ loading: true });
    let forms = [];
    let attributes = [];
    let fields = {};

    try {
      forms = await _loadForms(this);
      attributes = await _loadAttributes(this);

      // convert attributes to fields
      attributes.forEach(a => {
        fields[a.id] = { label: a.name, type: a.type, optional: true, options: a.values };
        //if (a.values) fields[a.id].options =
      });
    } catch (e) {
      notify_error(e, 'Unable to load forms.');
    }
    this.setState({ forms, attributes, fields, loading: false });
  };

  _deleteForm = async id => {
    this.setState({ saving: true, menuDelete: false });
    try {
      await _fetch(this.props.server, API_BASE_URI+'/form/delete', 'POST', {
        formId: id
      });
      notify_success('Form has been deleted.');
    } catch (e) {
      notify_error(e, 'Unable to delete form.');
    }
    this.setState({ saving: false });

    window.location.href = '/HelloVoterHQ/#/forms/';
    this._loadData();
  };

  _createForm = async () => {
    let json = this.addFormForm.getValue();
    if (json === null) return;

    // get rid of ending whitespace
    let formName = json.name.trim();

    // disallow anything other than alphanumeric and a few other chars
    if (!formName.match(/^[a-zA-Z0-9\-_ ]+$/)) {
      notify_error(
        {},
        'From name can only contain alphanumeric characters, and spaces and dashes.'
      );
      return;
    }

    // max length
    if (formName.length > 255) {
      notify_error({}, 'Form name cannot be longer than 255 characters.');
      return;
    }

    this.setState({ saving: true });

    // make sure this name doesn't exist
    try {
      let obj;

      obj = {
        name: formName,
        attributes: Object.keys(this.state.fields),
      };

      await _fetch(this.props.server, API_BASE_URI+'/form/create', 'POST', obj);
      notify_success('Form has been created.');
    } catch (e) {
      notify_error(e, 'Unable to create form.');
    }
    this.setState({ saving: false });

    window.location.href = '/HelloVoterHQ/#/forms/';
    this._loadData();
  };

  render() {
    let list = [];

    this.state.forms.forEach(f => {
      if (this.state.search && !_searchStringify(f).includes(this.state.search))
        return;
      list.push(f);
    });

    return (
      <Router>
        <div>
          <Route
            exact={true}
            path="/forms/"
            render={() => (
              <RootLoader
                flag={this.state.loading}
                func={() => this._loadData()}
              >
                Search:{' '}
                <input
                  type="text"
                  value={this.state.value}
                  onChange={this.onTypeSearch}
                  data-tip="Search by name, email, location, or admin"
                />
                <br />
                <ListForms forms={list} refer={this} />
              </RootLoader>
            )}
          />
          <Route
            path="/forms/add"
            render={props => (
              <div>
                <t.form.Form
                  ref={ref => (this.addFormForm = ref)}
                  type={this.formServerItems}
                  options={this.formServerOptions}
                  onChange={e => this.onChangeForm(e)}
                  value={this.state.addFormForm}
                />

                {Object.keys(this.state.fields).map(f => {
                  let field = this.state.fields[f];
                  return (
                    <li key={f} style={{ marginLeft: 25 }}>
                      {field.label + (field.required ? ' *' : '')} :{' '}
                      {this.inputTypeToReadable(field.type)}{' '}
                      <Icon icon={faTimesCircle} color="red" />
                    </li>
                  );
                })}

                <button
                  style={{ margin: 25 }}
                  onClick={() => this._createForm()}
                >
                  Create Form
                </button>

              </div>
            )}
          />
          <Route
            path="/forms/view/:id"
            render={props => (
              <div>
                <CardForm
                  key={props.match.params.id}
                  id={props.match.params.id}
                  edit={true}
                  refer={this}
                />
                <br />
                <br />
                <br />
                <Button onClick={this.handleClickDelete} color="primary">
                  Delete Form
                </Button>
                <Dialog
                  open={this.state.menuDelete}
                  onClose={this.handleCloseDelete}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle id="alert-dialog-title">
                    Are you sure you wish to delete this form?
                  </DialogTitle>
                  <DialogActions>
                    <Button
                      onClick={this.handleCloseDelete}
                      color="primary"
                      autoFocus
                    >
                      No
                    </Button>
                    <Button
                      onClick={() => this._deleteForm(props.match.params.id)}
                      color="primary"
                    >
                      Yes
                    </Button>
                  </DialogActions>
                </Dialog>
              </div>
            )}
          />
          <DialogSaving flag={this.state.saving} />
        </div>
      </Router>
    );
  }
}

const ListForms = props => {
  const perPage = props.refer.state.perPage;
  let paginate = <div />;
  let list = [];

  props.forms.forEach((f, idx) => {
    let tp = Math.floor(idx / perPage) + 1;
    if (tp !== props.refer.state.pageNum) return;
    list.push(<CardForm key={f.id} form={f} refer={props.refer} />);
  });

  paginate = (
    <div style={{ display: 'flex' }}>
      <ReactPaginate
        previousLabel={'previous'}
        nextLabel={'next'}
        breakLabel={'...'}
        breakClassName={'break-me'}
        pageCount={props.forms.length / perPage}
        marginPagesDisplayed={1}
        pageRangeDisplayed={8}
        onPageChange={props.refer.handlePageClick}
        containerClassName={'pagination'}
        subContainerClassName={'pages pagination'}
        activeClassName={'active'}
      />
      &nbsp;&nbsp;&nbsp;
      <div style={{ width: 75 }}>
        # Per Page{' '}
        <Select
          value={{ value: perPage, label: perPage }}
          onChange={props.refer.handlePageNumChange}
          options={[
            { value: 5, label: 5 },
            { value: 10, label: 10 },
            { value: 25, label: 25 },
            { value: 50, label: 50 },
            { value: 100, label: 100 }
          ]}
        />
      </div>
    </div>
  );

  return (
    <div>
      <h3>
        {props.type}Forms ({props.forms.length})
      </h3>
      <Link to={'/forms/add'}>
        <button>Add Form</button>
      </Link>
      {paginate}
      {list}
      {paginate}
    </div>
  );
};

export class CardForm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      server: this.props.refer.props.server,
      form: this.props.form,
      selectedTeamsOption: [],
      selectedMembersOption: []
    };
  }

  componentDidMount() {
    if (!this.state.form) this._loadData();
  }

  handleTeamsChange = async selectedTeamsOption => {
    this.props.refer.setState({ saving: true });
    try {
      let obj = _handleSelectChange(
        this.state.selectedTeamsOption,
        selectedTeamsOption
      );

      for (let i in obj.add) {
        await _fetch(
          this.state.server,
          API_BASE_URI+'/form/assigned/team/add',
          'POST',
          { teamId: obj.add[i], formId: this.props.id }
        );
      }

      for (let i in obj.rm) {
        await _fetch(
          this.state.server,
          API_BASE_URI+'/form/assigned/team/remove',
          'POST',
          { teamId: obj.rm[i], formId: this.props.id }
        );
      }

      notify_success('Team assignments saved.');
      this.setState({ selectedTeamsOption });
    } catch (e) {
      notify_error(e, 'Unable to add/remove teams.');
    }
    this.props.refer.setState({ saving: false });
  };

  handleMembersChange = async selectedMembersOption => {
    this.props.refer.setState({ saving: true });
    try {
      let obj = _handleSelectChange(
        this.state.selectedMembersOption,
        selectedMembersOption
      );

      for (let i in obj.add) {
        await _fetch(
          this.state.server,
          API_BASE_URI+'/form/assigned/volunteer/add',
          'POST',
          { vId: obj.add[i], formId: this.props.id }
        );
      }

      for (let i in obj.rm) {
        await _fetch(
          this.state.server,
          API_BASE_URI+'/form/assigned/volunteer/remove',
          'POST',
          { vId: obj.rm[i], formId: this.props.id }
        );
      }

      notify_success('Volunteer assignments saved.');
      this.setState({ selectedMembersOption });
    } catch (e) {
      notify_error(e, 'Unable to add/remove teams.');
    }
    this.props.refer.setState({ saving: false });
  };

  _loadData = async () => {
    let form = {},
      volunteers = [],
      members = [],
      teams = [],
      teamsSelected = [];

    this.setState({ loading: true });

    try {
      [form, volunteers, members, teams, teamsSelected] = await Promise.all([
        _loadForm(this, this.props.id, true),
        _loadVolunteers(this.props.refer),
        _loadVolunteers(this.props.refer, 'form', this.props.id),
        _loadTeams(this.props.refer),
        _loadTeams(this.props.refer, 'form', this.props.id)
      ]);
    } catch (e) {
      notify_error(e, 'Unable to load form info.');
      return this.setState({ loading: false });
    }

    let teamOptions = [];
    let membersOption = [];
    let selectedTeamsOption = [];
    let selectedMembersOption = [];

    teams.forEach(t => {
      teamOptions.push({
        value: _searchStringify(t),
        id: t.id,
        label: <CardTeam key={t.id} team={t} refer={this} />
      });
    });

    teamsSelected.forEach(t => {
      selectedTeamsOption.push({
        value: _searchStringify(t),
        id: t.id,
        label: <CardTeam key={t.id} team={t} refer={this} />
      });
    });

    volunteers.forEach(c => {
      membersOption.push({
        value: _searchStringify(c),
        id: c.id,
        label: <CardVolunteer key={c.id} volunteer={c} refer={this} />
      });
    });

    members.forEach(c => {
      selectedMembersOption.push({
        value: _searchStringify(c),
        id: c.id,
        label: <CardVolunteer key={c.id} volunteer={c} refer={this} />
      });
    });

    this.setState({
      form,
      volunteers,
      teamOptions,
      membersOption,
      selectedTeamsOption,
      selectedMembersOption,
      loading: false
    });
  };

  render() {
    const { form } = this.state;

    if (!form || this.state.loading) {
      return <CircularProgress />;
    }

    return (
      <div>
        <div style={{ display: 'flex', padding: '10px' }}>
          <div style={{ padding: '5px 10px' }}>
            <Icon
              icon={faClipboard}
              style={{ width: 20, height: 20, color: 'gray' }}
            />{' '}
            {form.name}{' '}
            {this.props.edit ? (
              ''
            ) : (
              <Link to={'/forms/view/' + form.id}>view</Link>
            )}
          </div>
        </div>
        {this.props.edit ? <CardFormFull form={form} refer={this} /> : ''}
      </div>
    );
  }
}

export const CardFormFull = props => (
  <div>
    <div>
      <br />
      Teams assigned to this form:
      <Select
        value={props.refer.state.selectedTeamsOption}
        onChange={props.refer.handleTeamsChange}
        options={props.refer.state.teamOptions}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
      <br />
      Volunteers assigned directly to this form:
      <Select
        value={props.refer.state.selectedMembersOption}
        onChange={props.refer.handleMembersChange}
        options={props.refer.state.membersOption}
        isMulti={true}
        isSearchable={true}
        placeholder="None"
      />
    </div>
  </div>
);
