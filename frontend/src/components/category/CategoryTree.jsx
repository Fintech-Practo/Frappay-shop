import React from 'react';
import { Link } from 'react-router-dom';
import './CategoryTree.css';

const CategoryTree = ({ categories, parentPath = '' }) => {
  const renderCategory = (cat) => {
    const currentPath = parentPath ? `${parentPath}/${cat.slug}` : cat.slug;
    const fullUrl = `/category/${currentPath}`;

    return (
      <div key={cat.id} className="category-node">
        <Link to={fullUrl} className="category-link">
          {cat.name}
        </Link>

        {cat.children?.length > 0 && (
          <div className="category-children">
            {cat.children.map((child) => (
              <CategoryTree 
                key={child.id} 
                categories={[child]} 
                parentPath={currentPath} 
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="category-tree-container">
      {categories.map(renderCategory)}
    </div>
  );
};

export default CategoryTree;
