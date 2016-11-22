///<reference path="../../../headers/common.d.ts" />

import angular from 'angular';
import config from 'app/core/config';
import _ from 'lodash';
import $ from 'jquery';
import coreModule from '../../core_module';
import appEvents from 'app/core/app_events';

export class SideMenuCtrl {
  isSignedIn: boolean;
  showSignout: boolean;
  user: any;
  mainLinks: any;
  orgMenu: any;
  appSubUrl: string;
  loginUrl: string;

  isOpen: boolean;
  query: any;
  giveSearchFocus: number;
  selectedIndex: number;
  results: any;
  currentSearchId: number;
  tagsMode: boolean;
  showImport: boolean;
  dismiss: any;
  ignoreClose: any;



  /** @ngInject */
  constructor(private $scope, private $location,private $timeout, private contextSrv, private backendSrv, private $element) {
    this.isSignedIn = contextSrv.isSignedIn;
    this.user = contextSrv.user;
    this.appSubUrl = config.appSubUrl;
    this.showSignout = this.contextSrv.isSignedIn && !config['authProxyEnabled'];

    this.mainLinks = config.bootData.mainNavLinks;
    this.openUserDropdown();
    this.openSearch();
    this.loginUrl = 'login?redirect=' + encodeURIComponent(this.$location.path());

    this.$scope.$on('$routeChangeSuccess', () => {
      if (!this.contextSrv.pinned) {
        this.contextSrv.sidemenu = false;
      }
      this.loginUrl = 'login?redirect=' + encodeURIComponent(this.$location.path());
    });
  }


  openSearch() {
    this.isOpen = true;
    this.giveSearchFocus = 0;
    this.selectedIndex = -1;
    this.results = [];
    this.query = { query: '', tag: [], starred: false };
    this.currentSearchId = 0;
    this.ignoreClose = true;

    this.$timeout(() => {
      this.ignoreClose = false;
      this.giveSearchFocus = this.giveSearchFocus + 1;
      this.query.query = '';
      this.search();
    }, 100);
  }

  searchDashboards() {
    this.tagsMode = false;
    this.currentSearchId = this.currentSearchId + 1;
    var localSearchId = this.currentSearchId;

    return this.backendSrv.search(this.query).then((results) => {
      if (localSearchId < this.currentSearchId) { return; }

      this.results = _.map(results, function(dash) {
        dash.url = 'dashboard/' + dash.uri;
        return dash;
      });

      if (this.queryHasNoFilters()) {
        this.results.unshift({ title: 'Home', url: config.appSubUrl + '/', type: 'dash-home' });
      }
    });
  };

  search() {
    this.showImport = false;
    this.selectedIndex = 0;
    this.searchDashboards();
  };


  queryHasNoFilters() {
    var query = this.query;
    return query.query === '' && query.starred === false && query.tag.length === 0;
  };



 getUrl(url) {
   return config.appSubUrl + url;
 }

 openUserDropdown() {
   this.orgMenu = [
     {section: 'You', cssClass: 'dropdown-menu-title'},
     {text: 'Profile', url: this.getUrl('/profile')},
   ];

   if (this.isSignedIn) {
     this.orgMenu.push({text: "Sign out", url: this.getUrl("/logout"), target: "_self"});
   }

   if (this.contextSrv.hasRole('Admin')) {
     this.orgMenu.push({section: this.user.orgName, cssClass: 'dropdown-menu-title'});
     this.orgMenu.push({
       text: "Preferences",
       url: this.getUrl("/org"),
     });
     this.orgMenu.push({
       text: "Users",
       url: this.getUrl("/org/users"),
     });
     this.orgMenu.push({
       text: "API Keys",
       url: this.getUrl("/org/apikeys"),
     });
   }

   this.orgMenu.push({cssClass: "divider"});

   this.backendSrv.get('/api/user/orgs').then(orgs => {
     orgs.forEach(org => {
       if (org.orgId === this.contextSrv.user.orgId) {
         return;
       }

       this.orgMenu.push({
         text: "Switch to " + org.name,
         icon: "fa fa-fw fa-random",
         url: this.getUrl('/profile/switch-org/' + org.orgId),
         target: '_self'
       });
     });

     if (config.allowOrgCreate) {
       this.orgMenu.push({text: "New organization", icon: "fa fa-fw fa-plus", url: this.getUrl('/org/new')});
     }
   });
 }
}

export function sideMenuDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/core/components/sidemenu/sidemenu.html',
    controller: SideMenuCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {},
    link: function(scope, elem) {
      // hack to hide dropdown menu
      elem.on('click.dropdown', '.dropdown-menu a', function(evt) {
        var menu = $(evt.target).parents('.dropdown-menu');
        var parent = menu.parent();
        menu.detach();

        setTimeout(function() {
          parent.append(menu);
        }, 100);
      });

      scope.$on("$destory", function() {
        elem.off('click.dropdown');
      });
    }
  };
}

coreModule.directive('sidemenu', sideMenuDirective);
