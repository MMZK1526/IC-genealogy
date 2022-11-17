export class FilterModel {
  constructor(bloodline) {
    this.bloodline = bloodline;
    this.removeHiddenPeople = false;
    this.fromYear = '';
    this.toYear = '';
    this.textFilters = {};
    this.allFamilies = new Set();
    this.families = new Set();
    this.allBirthPlaces = new Set();
    this.birthPlaces = new Set();
    this.allDeathPlaces = new Set();
    this.deathPlaces = new Set();
    this.hiddenPeople = new Set();
  }
}
