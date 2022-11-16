export class FilterModel {
  constructor(bloodline) {
    this.bloodline = bloodline;
    this.distance = 1;
    this.allFamilies = new Set();
    this.families = new Set();
    this.fromYear = '';
    this.toYear = '';
    this.allBirthPlaces = new Set();
    this.birthPlaces = new Set();
    this.allDeathPlaces = new Set();
    this.deathPlaces = new Set();
    this.personalName = '';
  }
}
