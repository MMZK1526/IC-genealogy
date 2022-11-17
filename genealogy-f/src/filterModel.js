export class FilterModel {
  constructor(bloodline) {
    this.bloodline = bloodline;
    this.removeHiddenPeople = false;
    this.fromYear = '';
    this.toYear = '';
    this.textFilters = {};
  }
}
