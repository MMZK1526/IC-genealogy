export class GroupModel {
    constructor() {
        // // Old
        // this.globalSet = new Set()
        // this.groupSet = new Set()
        // this.groupItemSet = new Set()

        // New
        this.defaultProperties = new Set(); // Default shown properties

        this.currentGroupId = 0; // Currently shown group
        this.groupsCount = 1;

        this.groupsList = [{
            // id: 0,
            name: "Group 0",
            members: new Set(),
            properties: new Set()
        }];
    }

    /* ### Initialize ### */
    initialize(initialSet) {
        this.defaultProperties = new Set([...initialSet].filter((x) => x !== 'id'));
        this.groupsList[this.currentGroupId].properties = new Set([...this.defaultProperties]);
    }

    /* ### Whole group operations ### */
    addNewGroup() {
        this.groupsList.push({
            // id: this.groupsCount,
            name: "Group " + this.groupsCount,
            members: new Set(),
            properties: new Set([...this.defaultProperties])
        });
        this.groupsCount += 1;
    }

    /* ### Getters ### */
    getCurrentGroupId() {
        return this.currentGroupId;
    }

    getCurrGroupMembers() {
        return this.groupsList[this.currentGroupId].members;
    }

    getCurrGroupProperties() {
        return this.groupsList[this.currentGroupId].properties;
    }

    getDefaultProperties() {
        return this.defaultProperties;
    }

    getAllGroups() {
        return this.groupsList;
    }

    // Get all groups a person belongs in
    getGroupsForPerson(personId) {
        let result = [];

        for (const groupId in this.groupsList) {
            if (this.groupsList[groupId].members.has(personId)) {
                result.push(this.groupsList[groupId]);
            }
        }

        return result;
    }

    /* ### Setters ### */
    setCurrentGroupId(groupId) {
        this.currentGroupId = groupId;
    }

    addPersonToGroup(personId) {
        this.groupsList[this.currentGroupId].members.add(personId);
    }

    removePersonFromGroup(personId) {
        this.groupsList[this.currentGroupId].members.delete(personId);
    }

    addPropertyToGroup(property) {
        this.groupsList[this.currentGroupId].properties.add(property);
    }

    removePropertyFromGroup(property) {
        this.groupsList[this.currentGroupId].properties.delete(property);
    }

    addPropertyDefault(property) {
        this.defaultProperties.add(property);
    }

    removePropertyDefault(property) {
        this.defaultProperties.delete(property);
    }

    /* Checker for properties */
    checkPropertyShownForPerson(personId, property) {
        /*
         * If:
         * 1. ANY one group containing this person has the property, or
         * 2. person blongs to NO group AND the property is displayed by default, 
         * then this property is displayed.
         */

        let oneGroupHasPerson = false;

        for (const groupId in this.groupsList) {
            if (this.groupsList[groupId].members.has(personId)) {
                oneGroupHasPerson = true;

                if (this.groupsList[groupId].properties.has(property)) {
                    return true;
                }
            }
        }

        return !oneGroupHasPerson && this.defaultProperties.has(property);
    }

    checkPersonInCurrGroup(personId) {
        return this.groupsList[this.currentGroupId].members.has(personId);
    }
  }
  