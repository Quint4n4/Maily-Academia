import { useEffect } from 'react';
import CoursesList from '../CoursesList';
import { useSection } from '../../context/SectionContext';

const MailyCourses = () => {
  const { setCurrentSection } = useSection();

  useEffect(() => {
    setCurrentSection('maily-academia');
  }, [setCurrentSection]);

  return <CoursesList sectionSlug="maily-academia" />;
};

export default MailyCourses;

