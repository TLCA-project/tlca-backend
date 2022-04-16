/**
 * Complete the paths for banners and logo after retrieving
 * data from MongoDB so that to reference their locations.
 */
export function getPathCompleter(name) {
  return (data, next) => {
    if (!Array.isArray(data)) {
      data = [data];
    }

    data.forEach(d => {
      if (d.banner) {
        d.banner = `/uploads/${name}/${d._id}/${d.banner}`;
      }
      if (d.logo) {
        d.logo = `/uploads/${name}/${d._id}/${d.logo}`;
      }
    });
  
    next();
  }
}
