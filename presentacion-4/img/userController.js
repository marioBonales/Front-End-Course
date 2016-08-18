/*global angular, window */
angular.module("portalApp.user").controller("userCreateController", [
    "$translatePartialLoader",
    '$routeParams',
    "UserService",
    '$modal',
    'BUService',
    '$filter',
    'SiteService',
    '$location',
    '$scope',
    '$translate',
    'AlertService',
    'CustomFilter',
    '$q',
    'LoadingService',
    '$timeout',
    function ($translatePartialLoader,
              $routeParams,
              UserService,
              $modal,
              BUService,
              $filter,
              SiteService,
              $location,
              $scope,
              $translate,
              AlertService,
              CustomFilter,
              $q,
              LoadingService,
              $timeout) {
        'use strict';
        var vm = this, baseUrl = "user/", translateRole, AgentSettings, Throttling, AgentChatSettings, FilterList,
            ApiAttributes = UserService.getApiSettings(vm.siteId), checkExistsTimer = 0, MAX_COMBOS = 1000,
            roleTranslationPromises = [], GENERAL_PAGE, AGENT_CONFIG_PAGE, AGENT_SKILLS_PAGE, API_SETTINGS_PAGE, grantableRolesPromise, grantableRoles;
        $translatePartialLoader.addPart("user");
        GENERAL_PAGE = {
            name: "USER.CREATE.GENERAL",
            page: "general",
            link: baseUrl + "general",
            disabled: false,
            done: false
        };
        AGENT_CONFIG_PAGE = {
            name: "USER.CREATE.AGENTCONFIG",
            page: "agent",
            link: baseUrl + "agent",
            valid: true,
            disabled: true,
            done: false
        };
        AGENT_SKILLS_PAGE = {
            name: "USER.CREATE.AGENTSKILLS",
            page: "skills",
            link: baseUrl + "skills",
            valid: true,
            disabled: true,
            done: false
        };
        API_SETTINGS_PAGE = {
            name: "USER.CREATE.APISETTINGS",
            page: "api",
            link: baseUrl + "api",
            disabled: true,
            valid: true,
            done: false
        };
        vm.createItems = [
            GENERAL_PAGE,
            AGENT_CONFIG_PAGE,
            AGENT_SKILLS_PAGE,
            API_SETTINGS_PAGE
        ];
        vm.languages = [
            {name: "English", value: "en"},
            {name: "German", value: "de"},
            {name: "French", value: "fr"},
            {name: "English-uk", value: "en_GB"},
            {name: "Spanish", value: "es"},
            {name: "Japanese", value: "ja"},
            {name: "Italian", value: "it"},
            {name: "Dutch", value: "nl"}
        ];
        vm.page = $routeParams.page || GENERAL_PAGE;

        $scope.$watch('user.page', function (newValue, oldValue) {
            if (oldValue && oldValue !== newValue) {
                oldValue.done = true;
            }
        });
        vm.hasApiSettingsEnabled = function () {
            var i, possiblePrivileges = [
                'PRIVILEGE_CUSTOM_REPORT',
                'PRIVILEGE_STANDARD_REPORT',
                'PRIVILEGE_CLIENT_TRANSCRIPT',
                'PRIVILEGE_API_TRANSCRIPT_HISTORIC',
                'PRIVILEGE_API_TRANSCRIPT_REALTIME',
                'PRIVILEGE_API_METRIC_REALTIME',
                'PRIVILEGE_AGENT_INTERFACE',
                'PRIVILEGE_SUPERVISOR_INTERFACE',
                'PRIVILEGE_API_THROTTLING'
            ];
            for (i = 0; i < vm.privileges.length; i += 1) {
                if (possiblePrivileges.indexOf(vm.privileges[i]) !== -1) {
                    return true;
                }
            }
            return false;
        };
        vm.next = function () {
            var newIndex = vm.isNextEnabled();
            if (angular.isNumber(newIndex)) {
                vm.page = vm.createItems[newIndex];
            }
        };
        vm.isNextEnabled = function () {
            var index = vm.createItems.indexOf(vm.page) + 1;
            for (index; index < vm.createItems.length; index += 1) {
                if (vm.createItems[index].disabled === false) {
                    return index;
                }
            }
            return false;
        };
        vm.previous = function () {
            var index = vm.createItems.indexOf(vm.page) - 1;
            for (index; index >= 0; index -= 1) {
                if (vm.createItems[index].disabled === false) {
                    vm.page = vm.createItems[index];
                    break;
                }
            }
        };
        vm.siteId = parseInt($routeParams.siteId, 10);
        vm.user = {
            password: {},
            skills: [],
            filter: [],
            roles: [],
            agentSettings: {},
            agentChatSettings: [],
            defaultSiteId: vm.siteId
        };
        vm.password = {};
        vm.mode = "";
        vm.BusinessUnits = [];
        vm.AgentGroups = [];
        vm.sites = [];
        vm.selectedIndex = [];
        vm.FlatAgentGroups = [];
        vm.FlatBusinessUnits = [];
        vm.privilegesLoaded = false;
        vm.privileges = [];
        vm.requiredNames = [];
        vm.missingRequired = [];
        vm.allValid = function () {
            return vm.createItems.every(function (page) {
                return page.valid;
            });
        };
        translateRole = function (roleObject) {
            roleTranslationPromises.push($translate("USER.ROLES." + roleObject.name).then(
                function (translation) {
                    roleObject.translation = translation;
                }
            ));
        };

        grantableRolesPromise = UserService.getRoles(grantableRoles).get().$promise.then(function (roles) {
            vm.roles = [];
            angular.forEach(roles.roles, function (role) {
                var roleObject = {name: role, translation: role};
                vm.roles.push(roleObject);
                translateRole(roleObject);
            });
            $q.all(roleTranslationPromises).then(function () {
                vm.roles = $filter('unicodeSort')(vm.roles, 'translation');
            });
        });
        UserService.getCurrentUser().get({
            columns: "id,allAccess,allAgentGroup,allBusinessUnit",
            includePrivileges: true
        }, function (currentUser) {
            var privileges = $filter("filter")(currentUser.privileges, function (privilege) {
                return privilege.name === 'PRIVILEGE_USER_MANAGEMENT_RW' || privilege.name === 'PRIVILEGE_NEW_USER_MANAGEMENT_RW';
            });
            if (!privileges || privileges.length === 0) {
                vm.canEdit = false;
            } else {
                vm.canEdit = true;
            }
            vm.currentUser = currentUser;
        });

        function findTypeIndex(type) {
            return vm.apiAttributes.findIndex(
                function (apiAttribute) {
                    return apiAttribute.attributeType === type;
                }
            );
        }

        if ($routeParams.user !== "create") {
            vm.mode = "edit";
            UserService.getUser(vm.siteId, $routeParams.user).get(function (user) {
                vm.user = user;
                FilterList = UserService.getUserFilterList($routeParams.user, $routeParams.siteId);
                vm.user.filter = [];
                vm.user.password = {};
                vm.object = FilterList.get(function (data) {
                    angular.forEach(data.records, function (key, index) {
                        vm.user.filter.push(key);
                        vm.selectedIndex.push(findTypeIndex(key.type));
                        if (vm.findName(index).values) {
                            key.value = key.value.split(' OR ').map(
                                function (value) {
                                    return {text: value};
                                }
                            );
                        }
                        if (!key.operator) {
                            key.operator = "";
                        }
                    });
                });

                AgentSettings = UserService.getAgentSettings($routeParams.user);
                //get the AgentSettings into the web application
                vm.object = AgentSettings.get(function (data) {
                    vm.user.agentSetting = data;
                });
                AgentChatSettings = UserService.getAgentChatSettings($routeParams.user);
                //get the AgentChatSettings into the web application
                vm.object = AgentChatSettings.get(function (data) {
                    vm.user.agentChatSettings = data.records;
                });
                Throttling = UserService.getThrottling($routeParams.user);
                vm.object = Throttling.get(function (data) {
                    vm.user.throttling = data.requestCount;
                });
                $q.all(roleTranslationPromises.concat(grantableRolesPromise)).then(function () {
                    user.roles = $filter('filter')(user.roles, function (role) {
                        return $filter('filter')(vm.roles, {name: role.name}).length > 0;
                    });
                });
                angular.forEach(user.roles, translateRole);
                if (user.allAccess) {
                    vm.user.sites = [];
                    vm.allAccessChanged();
                } else {
                    angular.forEach(user.sites, function (site) {
                        vm.addSite(site, true);
                    });
                    angular.forEach(user.agentGroups, function (ag) {
                        var site = $filter('filter')(user.sites, {id: ag.siteId})[0];
                        ag.name = "(" + site.name + ") " + ag.name;
                    });
                    angular.forEach(user.businessUnits, function (bu) {
                        var site = $filter('filter')(user.sites, {id: bu.siteId})[0];
                        bu.name = "(" + site.name + ") " + bu.name;
                    });
                }
                vm.updateAllAccessEnabled();
                LoadingService.hide();
            });
            UserService.getSite(vm.siteId).get(function (site) {
                vm.currentSite = site;
            });
        } else {
            UserService.getSite(vm.siteId).get(function (site) {
                vm.user.sites = [site];
                vm.currentSite = site;
                vm.addSite(site);
                LoadingService.hide();
            });
            vm.user.language = vm.languages[0].value;
            baseUrl += "create/";
            vm.mode = "create";
            vm.privilegesLoaded = true;
        }
        vm.loadRoles = function (query) {
            return CustomFilter.filter(vm.roles, query, "translation");
        };

        vm.getSite = function (siteId) {
            var site = $filter('filter')(vm.sites.records, {id: siteId}, true)[0];
            return site ? site.name : "";
        };

        vm.addSite = function (site, initialSave) {
            if (!vm.BusinessUnits[site.id]) {
                BUService.getBusinessUnits(site.id).get(function (result) {
                    vm.BusinessUnits[site.id] = result.records;
                    if (Array.isArray(result.records)) {
                        result.records.forEach(function (record) {
                            record.name = "(" + site.name + ") " + record.name;
                            vm.FlatBusinessUnits.push(record);
                        });
                    }
                });
            }

            if (!initialSave && vm.user.allBusinessUnit) {
                vm.user.businessUnits = angular.copy(vm.FlatBusinessUnits);
                vm.user.allBusinessUnit = false;
            }

            if (!initialSave && vm.user.allAgentGroup) {
                vm.user.agentGroups = angular.copy(vm.FlatAgentGroups);
                vm.user.allAgentGroup = false;
            }

            if (!vm.AgentGroups[site.id]) {
                UserService.getAgentGroups(site.id).get(function (result) {
                    vm.AgentGroups[site.id] = result.records;
                    if (Array.isArray(result.records)) {
                        result.records.forEach(function (record) {
                            record.name = "(" + site.name + ") " + record.name;
                            vm.FlatAgentGroups.push(record);
                        });
                    }
                });
            }
            if (!vm.user.defaultSiteId) {
                vm.user.defaultSiteId = site.id;
            }

            UserService.getNames(site.id).query({columns: "name,siteId,required,exclusive"},
                function (result) {
                    site.names = result;
                    vm.requiredNames = vm.requiredNames.concat(
                        $filter('filter')(site.names, {required: true})
                    );
                    vm.updateMissingRequired();
                }
            );
        };
        vm.hasEnabledAllAccess = false;
        vm.updateAllAccessEnabled = function () {
            if (vm.isAgent()) {
                vm.hasEnabledAllAccess = false;
                if (vm.user.allAccess || vm.user.allBusinessUnit || vm.user.allAgentGroup) {
                    AlertService.setAlert("USER.ALERTS.AGENT_ALL_ACCESS_CHANGED", "warning", "exclamation-triangle",
                        function () {
                            vm.allAccessHighlight = false;
                            vm.allBUHighlight = false;
                            vm.allAGHighlight = false;
                        });
                }
                if (vm.user.allAccess) {
                    vm.user.allAccess = false;
                    vm.allAccessHighlight = true;
                    vm.allBUHighlight = true;
                    vm.allAGHighlight = true;
                    vm.allAccessChanged();
                }

                if (vm.user.allBusinessUnit) {
                    vm.user.businessUnits = [];
                    vm.allBUHighlight = true;
                    vm.user.allBusinessUnit = false;
                }

                if (vm.user.allAgentGroup) {
                    vm.user.agentGroups = [];
                    vm.allAGHighlight = true;
                    vm.user.allAgentGroup = false;
                }

                return;
            }
            vm.hasEnabledAllAccess = vm.privileges.indexOf('PRIVILEGE_ALL_SITE_ACCESS') !== -1;
            if (vm.privilegesLoaded && !vm.hasEnabledAllAccess && vm.user.allAccess) {
                vm.user.allAccess = false;
                vm.allAccessChanged();
            }
            return true;
        };
        vm.checkSelfSite = function (site) {
            if (vm.currentUser.id === vm.user.id && vm.currentSite.id === site.id) {
                AlertService.setAlert("USER.ALERTS.CANNOT_DELETE_CURRENT_SITE", "warning");
                return false;
            }
            return true;
        };
        vm.getSelectedBusinessUnits = function (query) {
            if (vm.user.allAccess) {
                return [];
            }
            var finalBusinessUnits = [], sites = vm.user.sites;
            angular.forEach(sites, function (site) {
                angular.forEach(vm.BusinessUnits[site.id], function (bu) {
                    finalBusinessUnits.push({name: bu.name, id: bu.id, siteId: site.id});
                });
            });
            return $filter('orderBy')(CustomFilter.filter(finalBusinessUnits, query, "name"), 'name');
        };

        vm.getSelectedAgentGroups = function (query) {
            if (vm.user.allAccess) {
                return [];
            }
            var finalAgentGroups = [], sites = vm.user.sites;
            angular.forEach(sites, function (site) {
                angular.forEach(vm.AgentGroups[site.id], function (ag) {
                    finalAgentGroups.push({name: ag.name, id: ag.id, siteId: site.id});
                });
            });
            return $filter('orderBy')(CustomFilter.filter(finalAgentGroups, query, "name"), 'name');
        };

        vm.removeSite = function (site) {
            var deletedAgentGroups = [];
            //Delete data that has the site that was removed
            vm.user.businessUnits = $filter('filter')(vm.user.businessUnits, {siteId: site.id}, function (actual, expected) {
                return !angular.equals(actual, expected);
            });
            deletedAgentGroups = $filter('filter')(vm.user.agentGroups, {siteId: site.id}, function (actual, expected) {
                return angular.equals(actual, expected);
            });
            if (Array.isArray(deletedAgentGroups)) {
                deletedAgentGroups.forEach(function (agentGroup) {
                    vm.removeAgentGroup(agentGroup);
                });
            }
            vm.user.agentGroups = $filter('filter')(vm.user.agentGroups, {siteId: site.id}, function (actual, expected) {
                return !angular.equals(actual, expected);
            });
            vm.user.skills = $filter('filter')(vm.user.skills, {siteId: site.id}, function (actual, expected) {
                return !angular.equals(actual, expected);
            });
            if (vm.user.defaultSiteId === site.id && vm.user.sites && vm.user.sites.length > 0) {
                vm.user.defaultSiteId = vm.user.sites[0].id;
            }
            vm.FlatAgentGroups = $filter('filter')(vm.FlatAgentGroups, {siteId: site.id}, function (actual, expected) {
                return !angular.equals(actual, expected);
            });
            delete vm.BusinessUnits[site.id];
            vm.FlatBusinessUnits = $filter('filter')(vm.FlatBusinessUnits, {siteId: site.id}, function (actual, expected) {
                return !angular.equals(actual, expected);
            });
            delete vm.AgentGroups[site.id];

            vm.requiredNames = $filter('filter')(vm.requiredNames, function (name) {
                return name.siteId !== site.id;
            });
            vm.updateMissingRequired();
        };

        vm.removeAgentGroup = function (agentGroup) {
            var filterObject = {
                settingId: agentGroup.id
            };
            vm.user.agentChatSettings = $filter('filter')(vm.user.agentChatSettings, filterObject, function (actual, expected) {
                return !angular.equals(actual, expected);
            });
        };

        vm.loadSites = function (query) {
            return CustomFilter.filter(vm.sites.records, query, "name");
        };

        UserService.getSites().get(function (sites) {
            vm.sites = sites;
        });

        vm.saveUser = function () {
            $modal.open({
                animation: true,
                templateUrl: '/portal/angular/app/shared/confirm/reason.html',
                size: 'md',
                resolve: {
                    messages: function () {
                        return {
                            'message': 'REASON_MODAL.EDIT_USER',
                            'okButton': 'SAVE',
                            'type': "success"
                        };
                    }
                },
                controller: 'ReasonModalCtrl',
                controllerAs: 'modal'
            })
                .result.then(function (reason) {
                    var user = angular.copy(vm.user);
                    ['sites', 'businessUnits', 'agentGroups'].forEach(function (property) {
                        if (user[property]) {
                            user[property] = $filter('unicodeSort')(user[property].sort(), 'name');
                        }
                    });
                    user.sites.forEach(function (site) {
                        if (site.names) {
                            delete site.names;
                        }
                    });
                    if (user.skills && user.skills.length === 0) {
                        delete user.skills;
                    }
                    if (user.agentSetting && !user.agentSetting.maxChats && !user.agentSetting.maxForced) {
                        delete user.agentSetting;
                    }
                    if (user.filter) {
                        user.filter.forEach(
                            function (filter) {
                                if (angular.isArray(filter.value)) {
                                    filter.value = filter.value.map(
                                        function (f) {
                                            return f.text;
                                        }
                                    ).join(' OR ');
                                }
                            }
                        );
                    }
                    if (vm.mode === "create") {
                        angular.forEach(user.roles, function (role) {
                            delete role.translation;
                        });
                        UserService.saveUser(user.id).save(
                            {
                                changedRecord: user,
                                reason: reason,
                                siteId: vm.siteId
                            },
                            function () {
                                AlertService.setAlert("USER.ALERTS.SAVED_SUCCESS", "success");
                                $location.path('/user/' + vm.siteId + '/list');
                            },
                            function (response) {
                                if (response.data && response.data.errors) {
                                    angular.forEach(response.data.errors, function (error) {
                                        AlertService.setAlert(error, "danger");
                                    });
                                } else {
                                    AlertService.setAlert("USER.ALERTS.ERROR", "danger");
                                }
                            }
                        );
                    } else {
                        if (user.password && !user.password.password) {
                            delete user.password;
                        }
                        delete user.username;
                        angular.forEach(user.roles, function (role) {
                            delete role.translation;
                        });
                        UserService.saveUser(user.id).put({
                            changedRecord: user,
                            reason: reason,
                            siteId: vm.siteId,
                            userId: user.id
                        }, function () {
                            AlertService.setAlert("USER.ALERTS.SAVED_SUCCESS", "success");
                            $location.path('/user/' + vm.siteId + '/list');
                        }, function (response) {
                            if (response.data && response.data.errors) {
                                angular.forEach(response.data.errors, function (error) {
                                    AlertService.setAlert(error, "danger");
                                });
                            } else {
                                AlertService.setAlert("USER.ALERTS.ERROR", "danger");
                            }
                        });
                        vm.createItems.forEach(function (name) {
                            name.done = true;
                        });
                    }
                });
        };
        vm.allAccessChanged = function () {
            vm.user.sites = [];
            vm.user.agentGroups = [];
            vm.user.businessUnits = [];
            vm.user.allAgentGroup = vm.user.allAccess;
            vm.user.allBusinessUnit = vm.user.allAccess;
            if (!vm.user.allAccess) {
                vm.user.sites.push(vm.currentSite);
                vm.addSite(vm.currentSite);
                vm.user.defaultSiteId = vm.siteId;
            }
            if (!vm.user.defaultSiteId) {
                vm.user.defaultSiteId = vm.siteId;
            }
        };
        vm.addMaxChatWithinAgent = function () {
            if (!vm.user.agentChatSettings) {
                vm.user.agentChatSettings = [];
            }
            if (!vm.user.agentGroups || !vm.user.agentGroups.length || vm.user.agentChatSettings.length >= vm.user.agentGroups.length) {
                $modal.open({
                    animation: true,
                    templateUrl: '/portal/angular/app/shared/simpleModal/simpleModal.html',
                    controller: ['$modalInstance', function ($modalInstance) {
                        var vmModal = this;
                        vmModal.title = "USER.ALERTS.INFO";
                        vmModal.message = "USER.ALERTS.ADD_AGENT_GROUPS_FIRST";
                        vmModal.close = function () {
                            $modalInstance.close();
                        };
                    }],
                    controllerAs: 'modal',
                    size: 'md'
                });
            } else {
                vm.user.agentChatSettings.push({
                    userId: vm.userId,
                    maxChats: 1,
                    maxForced: 1
                });
            }
        };
        vm.removeMaxChatsWithinAgent = function (index) {
            if (vm.user.agentChatSettings) {
                vm.user.agentChatSettings.splice(index, 1);
            }
        };

        vm.defaultApiAttribute = {};
        vm.attributeOverride = [
            "BRAttr",
            "VisitorAttr",
            "AgentAttr",
            "BRAgentAttr"
        ];

        vm.attributeMap = {
            "BRAttr": "br_custom",
            "VisitorAttr": "visitor",
            "AgentAttr": "agent",
            "BRAgentAttr": "br_agent"
        };

        vm.apiAttributes = [];
        ApiAttributes = UserService.getApiSettings(vm.siteId);
        vm.object = ApiAttributes.get(function (data) {
            vm.apiAttributes = data.records;
        });


        vm.selectIndex = function (index) {
            vm.selectedIndex[index] = findTypeIndex(vm.user.filter[index].type);
            vm.user.filter[index].name = vm.apiAttributes[vm.selectedIndex[index]].attributeNames[0].name;
            if (vm.findName(index).values) {
                vm.user.filter[index].value = [];
            } else {
                vm.user.filter[index].value = "";
            }
        };
        vm.findName = function (index) {
            var selectedAttribute = vm.apiAttributes[vm.selectedIndex[index]];
            return selectedAttribute.attributeNames.find(function (name) {
                return vm.user.filter[index].name === name.name;
            });
        };
        vm.addSecurityFilter = function () {
            var typeMap = vm.attributeMap[vm.attributeOverride[0]];
            vm.user.filter.push({
                type: typeMap,
                name: vm.apiAttributes[findTypeIndex(typeMap)].attributeNames[0].name
            });
            vm.selectedIndex.push(0);
            vm.selectIndex(vm.selectedIndex.length - 1);
        };
        vm.removeSecurityFilter = function (index) {
            if (index >= 1 && index === vm.user.filter.length - 1) {
                vm.user.filter[index - 1].operator = "";
            }
            vm.user.filter.splice(index, 1);
            vm.selectedIndex.splice(index, 1);
        };
        vm.changeOperator = function (index) {
            if (vm.user.filter[index].operator && vm.user.filter[index + 1] === undefined) {
                vm.addSecurityFilter();
            }
        };
        vm.exists = false;
        vm.checkExists = function () {
            clearTimeout(checkExistsTimer);
            checkExistsTimer = setTimeout(function () {
                if (vm.user.username !== undefined && vm.user.username !== null && vm.user.username !== "") {
                    UserService.checkExists(vm.user.username).get(function (response) {
                        vm.exists = response.exists ? true : false;
                    });
                }
            }, 300);
        };
        vm.allAgentChanged = function () {
            if (vm.user.allAgentGroup) {
                vm.user.agentGroups = vm.FlatAgentGroups;
            } else {
                vm.user.agentChatSettings = [];
                vm.user.agentGroups = [];
            }
        };
        vm.allBusinessUnitsChanged = function () {
            if (vm.user.allBusinessUnit) {
                vm.user.businessUnits = vm.FlatBusinessUnits;
            } else {
                vm.user.businessUnits = [];
            }
        };
        vm.hasAgentPrivilege = false;

        $scope.$watch(
            function () {
                return SiteService.getSiteId();
            },
            function (newValue, oldValue) {

                if (newValue !== oldValue) {
                    $location.path('/user/' + newValue + '/list');
                }
            }
        );
        vm.isAgent = function () {
            return vm.hasAgentPrivilege;
        };

        vm.resetUserAgent = function () {
            AGENT_SKILLS_PAGE.done = AGENT_CONFIG_PAGE.done = false;
            AGENT_SKILLS_PAGE.valid = true;
            AGENT_SKILLS_PAGE.disabled = AGENT_CONFIG_PAGE.disabled =  true;
            // Do not reset vm.user.filter (api security filters) here. This shouldn't depend on agent interface privilege.
            vm.user.agentSetting = null;
            vm.user.skills = null;
            vm.user.agentChatSettings = null;
            vm.user.agentSetting = null;
        };
        $scope.$watch(function () {
            return vm.user.roles.length;
        }, function () {
            vm.privileges = [];
            if (vm.user.roles.length > 0) {
                var promises = [];
                vm.user.roles.forEach(
                    function (role) {
                        promises.push(UserService.getPrivileges(role.name).then(
                            function (privileges) {
                                if (privileges) {
                                    vm.privileges = vm.privileges.concat(privileges.map(
                                        function (privilege) {
                                            return privilege.name;
                                        }
                                    ));
                                    vm.updateAllAccessEnabled();
                                }
                            }
                        ));
                    }
                );
                $q.allSettled(promises).then(
                    function () {
                        if (vm.hasApiSettingsEnabled()) {
                            API_SETTINGS_PAGE.disabled = false;
                        } else {
                            API_SETTINGS_PAGE.disabled = true;
                            API_SETTINGS_PAGE.done = false;
                        }
                        vm.hasAgentPrivilege = vm.privileges.indexOf("PRIVILEGE_AGENT_INTERFACE") !== -1;
                        vm.updateAllAccessEnabled();
                        vm.privilegesLoaded = true;
                        if (vm.hasAgentPrivilege) {
                            if (!vm.user.agentSetting) {
                                vm.user.agentSetting = {
                                    maxChats: 1,
                                    maxForced: 1
                                };
                            } else {
                                if (!vm.user.agentSetting.maxChats) {
                                    vm.user.agentSetting.maxChats = 1;
                                }
                                if (!vm.user.agentSetting.maxForced) {
                                    vm.user.agentSetting.maxForced = 1;
                                }
                            }
                            AGENT_SKILLS_PAGE.disabled = AGENT_CONFIG_PAGE.disabled = API_SETTINGS_PAGE.disabled = false;
                            if (!vm.user.agentSettings) {
                                vm.user.agentSettings = {};
                            }
                            if (!vm.user.skills) {
                                vm.user.skills = [];
                            }
                        } else {
                            vm.resetUserAgent();
                        }
                        if (!vm.hasApiThrottlingRole()) {
                            vm.user.throttling = null;
                        }
                        vm.privilegesLoaded = true;
                    }
                );
            } else {
                vm.resetUserAgent();
                vm.privileges = [];
                vm.user.throttling = null;
                vm.hasAgentPrivilege = false;
                API_SETTINGS_PAGE.disabled = true;
                API_SETTINGS_PAGE.done = false;
                vm.updateAllAccessEnabled();
            }

        });
        vm.updateMissingRequired = function () {
            var required = $filter('filter')(vm.requiredNames, function (name) {
                if (!angular.isArray(vm.user.skills)) {
                    return [];
                }
                return !vm.user.skills.some(function (skill) {
                    return skill.name === name.name;
                });
            });
            vm.missingRequired = required;
        };
        $scope.$watch(
            function () {
                if (!vm.isAgent()) {
                    return true;
                }
                return vm.missingRequired.length === 0 && vm.skillsCombosValid;
            },
            function (newValue) {
                AGENT_SKILLS_PAGE.valid = newValue;
            }
        );
        vm.getMissingFormatted = function () {
            return vm.missingRequired.map(function (name) {
                return vm.getSite(name.siteId) + ": " + name.name;
            }).join(', ');
        };
        vm.loadValues = function (query, index) {
            return CustomFilter.filter(vm.findName(index).values, query);
        };
        vm.checkSkillCombos = function () {
            var combos = 1, skills;
            if (!vm.user.skills || vm.user.skills.length === 0) {
                return 0;
            }
            skills = $filter('groupBy')(vm.user.skills, 'siteId');
            angular.forEach(Object.keys(skills), function (key) {
                skills[key] = $filter('groupBy')(skills[key], 'name');
            });
            angular.forEach(Object.keys(skills), function (site) {
                angular.forEach(Object.keys(skills[site]), function (name) {
                    combos *= skills[site][name].length;
                });
            });
            return combos;
        };
        vm.hasApiThrottlingRole = function () {
            return vm.privileges.indexOf("PRIVILEGE_API_THROTTLING") !== -1;
        }
        $scope.$watch(
            function () {
                return vm.user.skills ? vm.user.skills.length : 0;
            },
            function () {
                var combos = vm.checkSkillCombos();
                vm.skillsCombosValid = combos <= MAX_COMBOS;
                AGENT_SKILLS_PAGE.valid = vm.missingRequired.length === 0 && vm.skillsCombosValid;
            }
        );
    }]).controller("userListController",
    ['$translatePartialLoader',
        'UserService',
        'BUService',
        '$scope',
        '$filter',
        '$modal',
        '$routeParams',
        '$location',
        'SiteService',
        'AlertService',
        '$translate',
        '$rootScope',
        '$window',
        '$document',
        '$timeout',
        'LoadingService',
        function (
            $translatePartialLoader,
            UserService,
            BUService,
            $scope,
            $filter,
            $modal,
            $routeParams,
            $location,
            SiteService,
            AlertService,
            $translate,
            $rootScope,
            $window,
            $document,
            $timeout,
            LoadingService
        ) {
            'use strict';
            var vm = this, umFilters;
            $translatePartialLoader.addPart("user");
            vm.sort = {
                column: null,
                reverse: false
            };
            vm.sortBy = function (column) {
                if (vm.sort.column === column) {
                    vm.sort.reverse = !vm.sort.reverse;
                } else {
                    vm.sort.column = column;
                    vm.sort.reverse = false;
                }
                UserService.setStorage('UMSort', vm.sort);
                vm.getUsers();
            };
            vm.getUsers = function (scrollBottom, pageLoadFlag) {
                var filters = angular.copy(vm.filters);
                if (filters.role === "") {
                    delete filters.role;
                }
                if (filters.agentSkillIds && vm.filters.agentSkillIds.length === 0) {
                    delete filters.agentSkillIds;
                }
                if (filters.agentSkillIds) {
                    filters.agentSkillIds = vm.filters.agentSkillIds.map(function (skill) {
                        return skill.id;
                    }).join(',');
                }
                vm.selectedUsers = [];
                vm.idSelected = null;
                UserService.getUsers(vm.siteId, vm.page, vm.numPerPage.value, filters, vm.sort.column, vm.sort.reverse).get(function (users) {
                    var previousTop = $document[0].documentElement.scrollHeight - $window.pageYOffset;
                    vm.users = users;
                    if (scrollBottom) {
                        //wait for the scope to finish updating the DOM
                        $timeout(function () {
                            $window.scrollTo(0, $document[0].documentElement.scrollHeight - previousTop);
                        });
                    }
                    vm.sort.column = users.sort;
                    vm.sort.reverse = users.order === "DESC";
                    UserService.setStorage('UMSort', vm.sort);
                    if(pageLoadFlag == true){
                        LoadingService.hide();
                    }
                });
            };
            vm.page = UserService.getStorage("page") || 1;
            vm.paginationModel = [
                {
                    value: 10
                },
                {
                    value: 20
                },
                {
                    value: 50
                },
                {
                    value: 75
                },
                {
                    value: 100
                }
            ];
            vm.numPerPage = UserService.getStorage("recordsShown") || vm.paginationModel[1];
            vm.siteId = $routeParams.siteId;
            vm.canEdit = false;
            vm.canResetPassword = false;
            UserService.hasAnyPrivilege(
                [
                    'PRIVILEGE_USER_MANAGEMENT_RW',
                    'PRIVILEGE_NEW_USER_MANAGEMENT_RW',
                    'PRIVILEGE_USER_MANAGEMENT_R',
                    'PRIVILEGE_NEW_USER_MANAGEMENT_R',
                    'PRIVILEGE_RESET_PASSWORD'
                ]
            ).then(
                function (privileges) {
                    if (privileges) {
                        vm.canEdit = privileges.find(function (privilege) {
                            return privilege === 'PRIVILEGE_USER_MANAGEMENT_RW' ||
                                privilege === 'PRIVILEGE_NEW_USER_MANAGEMENT_RW';
                        });
                        vm.canResetPassword = privileges.find(function (privilege) {
                            return privilege === 'PRIVILEGE_RESET_PASSWORD';
                        });
                    } else {
                        $location.path('/error');
                    }
                }
            );
            SiteService.getSite().get({id: vm.siteId, columns: "id,name,agentGroupsActive"}, function (site) {
                vm.site = site;
            });
            vm.filters = {};
            vm.privileges = [];
            vm.roleFilterChange = function () {
                if (vm.filters.role) {
                    UserService.getPrivileges(vm.filters.role).then(function updatePrivileges(privileges) {
                        if (!privileges) {
                            vm.privileges = [];
                        } else {
                            vm.privileges = privileges.map(function getPrivilegesName(privilege) {
                                return privilege.name;
                            });
                        }
                        if (vm.privileges.indexOf("PRIVILEGE_AGENT_INTERFACE") === -1) {
                            vm.filters.agentSkillIds = [];
                        }
                        vm.getUsers();
                    });
                } else {
                    vm.privileges = [];
                    vm.filters.agentSkillIds = [];
                    vm.getUsers();
                }
            };
            umFilters = UserService.getStorage('UMFilters');
            if (umFilters && umFilters.siteId === vm.siteId) {
                vm.filters = umFilters;
                vm.sort = UserService.getStorage('UMSort');
                vm.roleFilterChange();
            }
            vm.filters.siteId = vm.siteId;
            if (!vm.filters.agentSkillIds) {
                vm.filters.agentSkillIds = [];
            }
            vm.getUsers(null, true);
            BUService.getBusinessUnits(vm.siteId).get(function (result) {
                vm.businessUnits = result;
            });
            UserService.getAgentGroups(vm.siteId).get(function (result) {
                vm.agentGroups = result;
            });
            
            UserService.getRoles().get(function (roles) {
                vm.roles = roles.roles.map(
                    function (role) {
                        var roleObject = {
                            name: role
                        };
                        $translate("USER.ROLES." + roleObject.name).then(
                            function (translation) {
                                roleObject.translation = translation;
                            }
                        );
                        return roleObject;
                    }
                );
            });
            
            $rootScope.$on('$translateChangeSuccess', function () {
                if (!vm.roles || vm.roles.length === 0) {
                    return;
                }
                vm.roles.forEach(function (role) {
                    $translate('USER.ROLES.' + role.name).then(function (translation) {
                        role.translation = translation;
                    });
                });
            });
            vm.checkAllUsers = function () {
                angular.forEach(vm.users.records, function (user) {
                    user.checked = vm.allChecked;
                });
                vm.updateSelected();
                if (vm.allChecked) {
                    vm.selectedUsers = vm.users.records;
                    UserService.setStorage("UMSelected", vm.selectedUsers);
                } else {
                    vm.selectedUsers = [];
                    UserService.setStorage("UMSelected", vm.selectedUsers);
                }
            };
            vm.selectedUsers = [];
            UserService.setStorage("UMSelected", vm.selectedUsers);
            vm.getSelectedIds = function getSelectedIds() {
                return vm.selectedUsers.map(function getIds(user) {
                    return user.id;
                }).join(',');
            };
            vm.selectedAnyNotDisabled = [];
            $scope.$watch('userList.filters', function (newValue, oldValue) {
                if (newValue.role === oldValue.role &&
                    newValue.agentSkillIds.length === oldValue.agentSkillIds.length) {
                    vm.getUsers();
                    UserService.setStorage("UMFilters", vm.filters);
                }
            }, true);

            vm.updateSelected = function () {
                vm.selectedUsers = $filter('filter')(vm.users.records, {checked: true});
                UserService.setStorage("UMSelected", vm.selectedUsers);
                vm.selectedAnyNotDisabled = $filter('filter')(vm.selectedUsers, {disabled: false});
            };
            vm.delete = function () {
                if (vm.selectedUsers.length >= 1) {
                    $modal.open({
                        animation: true,
                        templateUrl: '/portal/angular/app/shared/confirm/reason.html',
                        size: 'md',
                        resolve: {
                            messages: function () {
                                return {
                                    'message': 'REASON_MODAL.DELETE_USER',
                                    'okButton': 'DELETE',
                                    'type': "danger"
                                };
                            }
                        },
                        controller: 'ReasonModalCtrl',
                        controllerAs: 'modal'
                    })
                        .result.then(function (reason) {
                            var join = 0;
                            vm.selectedUsers.forEach(function (selectedUser) {
                                if (!selectedUser.disabled) {
                                    UserService
                                        .getUser(vm.siteId, selectedUser.id, {changeReason: reason})
                                        .delete(
                                        function () {
                                            join += 1;
                                            if (join === vm.selectedUsers.length) {
                                                AlertService.setAlert("USER.ALERTS.DELETED_SUCCESS", "success");
                                                vm.getUsers();
                                            }
                                        },
                                        function (response) {
                                            if (response.data.errors) {
                                                angular.forEach(response.data.errors, function (error) {
                                                    AlertService.setAlert(error, "danger");
                                                });
                                            }
                                        }
                                    );
                                }
                            });
                        });
                }
            };
            vm.passwordReset = function () {
                if (vm.idSelected) {
                    var selectedUser = vm.idSelected;

                    $modal.open({
                        animation: true,
                        templateUrl: '/portal/angular/app/shared/confirm/passwordReset.html',
                        size: 'md',
                        controller: 'PasswordResetModalCtrl',
                        controllerAs: 'modal'
                    })
                        .result.then(function (result) {
                            UserService.resetUserPassword(selectedUser, result.reason).put(function (result) {
                                $modal.open({
                                    animation: true,
                                    templateUrl: '/portal/angular/app/shared/confirm/newPassword.html',
                                    size: 'md',
                                    resolve: {
                                        password: function () {
                                            return result.password;
                                        }
                                    },
                                    controller: 'NewPasswordModalCtrl',
                                    controllerAs: 'modal'
                                });
                            });
                        });
                }
            };
            vm.idSelected = null;

            //This will set the selection on the element for stylesheets
            vm.setSelected = function (user) {
                vm.idSelected = user.id;
                vm.selectedUser = user;
                if (!vm.selectedUsers || vm.selectedUsers.length === 0) {
                    UserService.setStorage("UMSelected", [vm.selectedUser]);
                }
            };

            $scope.$watch(
                function () {
                    return SiteService.getSiteId();
                },
                function (newValue, oldValue) {

                    if (newValue !== oldValue) {
                        $location.path('/user/' + newValue + '/list');
                    }
                }
            );

            vm.unlock = function () {
                UserService.updateLockedFlag(vm.siteId, vm.idSelected).put(
                    {},
                    function () {
                        AlertService.setAlert("USER.ALERTS.UNLOCK_SUCCESS", "success");
                        vm.getUsers();
                    },
                    function (response) {
                        if (response.data.errors) {
                            angular.forEach(response.data.errors, function (error) {
                                AlertService.setAlert(error, "danger");
                            });
                        }
                    }
                );

            };

            UserService.getNames().query({
                siteId: vm.siteId,
                columns: "name,value,id,siteId,required,exclusive",
                filterActiveOnly: false
            }, function (skills) {
                angular.forEach(skills, function (skill) {
                    skill.display = skill.name + ": " + skill.value;
                });
                vm.skills = skills;
            });

            vm.filterSkills = function (query) {
                return $filter('filter')(vm.skills, {display: query}, false);
            };
            vm.roleIsAgent = function () {
                return vm.privileges.indexOf("PRIVILEGE_AGENT_INTERFACE") !== -1;
            };

            vm.userHasAgent = function (user) {
                var index;
                if (!user.roles) {
                    return false;
                }
                for (index = 0; index < user.roles.length; index += 1) {
                    if (vm.roleIsAgent()) {
                        return true;
                    }
                }
                return false;
            };
            vm.usersAreAgents = function (users) {
                var index;
                for (index = 0; index < users.length; index += 1) {
                    if (!vm.userHasAgent(users[index])) {
                        return false;
                    }
                }
                return true;
            };

            vm.bulkUpdateModal = function () {
                var modal = $modal.open({
                    animation: true,
                    templateUrl: '/portal/angular/app/components/user/bulkUpdate.html',
                    size: 'lg',
                    backdrop: 'static',
                    resolve: {
                        messages: function () {
                            return {
                                'users': vm.selectedUsers
                            };
                        }
                    },
                    controller: ['$modalInstance', function ($modalInstance) {
                        var vmModal = this,
                            openReasonModal;
                        openReasonModal = function () {
                            $modal.open({
                                animation: true,
                                templateUrl: '/portal/angular/app/shared/confirm/reason.html',
                                size: 'md',
                                resolve: {
                                    messages: function () {
                                        return {
                                            type: "success",
                                            okButton: "SAVE",
                                            message: "REASON_MODAL.BULK_UPDATE"
                                        };
                                    }
                                },
                                controller: 'ReasonModalCtrl',
                                controllerAs: 'modal'
                            }).result.then(vmModal.save);
                        };
                        vmModal.loadAgentGroups = function (query) {
                            return UserService.getAgentGroups(vm.siteId, query).getTags().$promise;
                        };
                        vmModal.close = function () {
                            $modalInstance.dismiss();
                        };
                        vmModal.ok = function () {
                            if (
                                (!vmModal.businessUnitsSelected || vmModal.businessUnitsSelected.length === 0) &&
                                (!vmModal.agentGroupsSelected || vmModal.agentGroupsSelected.length === 0) &&
                                (!vmModal.agentSkillsSelected || vmModal.agentSkillsSelected.length === 0)
                            ) {
                                $modal.open({
                                    animation: true,
                                    templateUrl: '/portal/angular/app/shared/simpleModal/simpleModal.html',
                                    controller: ['$modalInstance', function ($modalInstance) {
                                        var vmConfirmModal = this;
                                        vmConfirmModal.title = "USER.ALERTS.INFO";
                                        vmConfirmModal.message = "ERRORS.SELECT_SOMETHING";
                                        vmConfirmModal.close = function () {
                                            $modalInstance.close();
                                        };
                                    }],
                                    controllerAs: 'modal',
                                    size: 'md'
                                });
                            } else {
                                if (vmModal.overwrite === "true") {
                                    $modal.open({
                                        templateUrl: '/portal/angular/app/shared/confirm/confirm.html',
                                        controller: 'ConfirmModalCtrl',
                                        controllerAs: "confirm",
                                        resolve: {
                                            message: function () {
                                                return "USER.ALERTS.BULK_CONFIRM";
                                            }
                                        },
                                        size: 'md'
                                    }).result.then(openReasonModal);

                                } else {
                                    openReasonModal();
                                }
                            }

                        };
                        vmModal.save = function (reason) {
                            vmModal.reason = reason;
                            $modalInstance.close(vmModal);
                        };
                        vmModal.filterSkills = vm.filterSkills;
                        vmModal.overwrite = "false";
                        vmModal.businessUnitsAvailable = vm.businessUnits.records;
                        vmModal.showAgentGroups = vm.site.agentGroupsActive;
                        vmModal.filterBUs = function (query) {
                            return $filter('filter')(vmModal.businessUnitsAvailable, {name: query}, false);
                        };
                        vmModal.selectedUsers = vm.selectedUsers;
                        vmModal.skillsAvailable = $filter('groupBy')(vm.skills, 'name');
                        vmModal.showSkills = vm.roleIsAgent();
                        vmModal.agentSkillsSelected = [];
                        vmModal.filterUsedSkills = function (value) {
                            var selectedIndex;
                            for (selectedIndex = 0; selectedIndex < vmModal.agentSkillsSelected.length; selectedIndex += 1) {
                                if (vmModal.agentSkillsSelected[selectedIndex].id === value.id) {
                                    return false;
                                }
                            }
                            return true;
                        };
                    }],
                    controllerAs: 'bulkUpdate'
                });
                modal.result.then(function (result) {
                    var bulkUpdate = {}, ids = result.selectedUsers.map(function (user) {
                        return user.id;
                    });
                    bulkUpdate.changedRecord = ids;
                    if (result.agentGroupsSelected && result.agentGroupsSelected.length > 0) {
                        bulkUpdate.agentGroups = result.agentGroupsSelected;
                    }
                    if (result.businessUnitsSelected && result.businessUnitsSelected.length > 0) {
                        bulkUpdate.businessUnits = result.businessUnitsSelected;
                    }
                    if (result.agentSkillsSelected && result.agentSkillsSelected.length > 0) {
                        var skills = angular.copy(result.agentSkillsSelected);
                        skills.forEach(function (agentSkill) {
                            delete agentSkill.display;
                        });
                        bulkUpdate.siteAgentAttributes = skills;
                    }
                    bulkUpdate.overwrite = result.overwrite === "true";
                    bulkUpdate.reason = result.reason;
                    UserService.bulkUpdate(vm.siteId).put(bulkUpdate,
                        function () {
                            AlertService.setAlert("USER.ALERTS.BULK_SUCCESS", "success");
                            vm.idSelected = null;
                            vm.allChecked = false;
                            vm.checkAllUsers();
                            vm.getUsers();
                        },
                        function () {
                            AlertService.setAlert("USER.ALERTS.BULK_ERROR", "danger");
                        }
                    );
                });
            };
            vm.editUser = function (user) {
                if (user.disabled) {
                    $modal.open({
                        animation: true,
                        templateUrl: '/portal/angular/app/shared/confirm/confirm.html',
                        size: 'md',
                        resolve: {
                            message: function () {
                                return "USER.ALERTS.ASK_ENABLE";
                            }
                        },
                        controller: 'ConfirmModalCtrl',
                        controllerAs: "confirm"
                    }).result.then(function () {
                        $location.path("/user/" + vm.siteId + "/" + "edit/" + user.id);
                    });
                } else {
                    $location.path("/user/" + vm.siteId + "/" + "edit/" + user.id);
                }
            };
            vm.showChangeLog = function () {
                $location.path("/user/" + vm.siteId + "/list/changeLog/");
            };
            vm.recordsShownChanged = function recordsShownChanged() {
                UserService.setStorage("recordsShown", vm.numPerPage);
                vm.page = 1;
                vm.savePage();
            };
            vm.savePage = function savePage() {
                UserService.setStorage("page", vm.page);
                vm.getUsers(true);
            };
        }
    ]
);
