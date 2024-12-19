const STRAPI_URL = 'http://localhost:1337'; // Base URL for Strapi

export async function fetchProjects() {
  try {
    const response = await fetch(`${STRAPI_URL}/projects`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const projects = await response.json();
    
    // Log the received data
    console.log('Raw API response:', projects);
    
    // Transform the data to match the expected structure
    const transformedProjects = projects.map(project => ({
      id: project.id,
      title: project.title,
      year: project.year,
      role: project.roles,
      image: project.cover_image?.url 
        ? `${STRAPI_URL}${project.cover_image.url}` // Add base URL to image path
        : null,
      url: project.link,
      description: project.description || ''
    }));
    
    // Log the transformed data
    console.log('Transformed projects:', transformedProjects);
    
    return transformedProjects;
  } catch (error) {
    console.error('Error in fetchProjects:', error);
    return [];
  }
}