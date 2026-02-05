 import { Job } from "@/types/job";
 
 const today = new Date();
 const yesterday = new Date(today);
 yesterday.setDate(yesterday.getDate() - 1);
 const twoDaysAgo = new Date(today);
 twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
 const threeDaysAgo = new Date(today);
 threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
 const fourDaysAgo = new Date(today);
 fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
 
 export const mockJobs: Job[] = [
   {
     id: "1",
     title: "Senior Frontend Developer",
     company: "TechCorp Inc.",
     location: "San Francisco, CA (Remote)",
     description: "We're looking for an experienced Frontend Developer to join our team. You'll be working on cutting-edge web applications using React, TypeScript, and modern CSS frameworks.",
     skills: ["React", "TypeScript", "Tailwind CSS", "GraphQL"],
     postedDate: today,
     externalApplyLink: "https://example.com/apply/1",
     isReviewing: true,
   },
   {
     id: "2",
     title: "Full Stack Engineer",
     company: "StartupXYZ",
     location: "New York, NY (Hybrid)",
     description: "Join our fast-growing startup as a Full Stack Engineer. Work on both frontend and backend systems, building features that impact millions of users.",
     skills: ["Node.js", "React", "PostgreSQL", "AWS"],
     postedDate: today,
     externalApplyLink: "https://example.com/apply/2",
     isReviewing: true,
   },
   {
     id: "3",
     title: "Product Designer",
     company: "DesignStudio",
     location: "Los Angeles, CA",
     description: "We need a creative Product Designer to craft beautiful user experiences. You'll work closely with engineering and product teams.",
     skills: ["Figma", "UI/UX", "Prototyping", "Design Systems"],
     postedDate: yesterday,
     externalApplyLink: "https://example.com/apply/3",
     isReviewing: false,
   },
   {
     id: "4",
     title: "Backend Developer",
     company: "DataFlow Systems",
     location: "Austin, TX (Remote)",
     description: "Looking for a skilled Backend Developer to build scalable APIs and microservices. Experience with distributed systems is a plus.",
     skills: ["Python", "Django", "Redis", "Docker"],
     postedDate: yesterday,
     externalApplyLink: "https://example.com/apply/4",
     isReviewing: true,
   },
   {
     id: "5",
     title: "DevOps Engineer",
     company: "CloudNine Tech",
     location: "Seattle, WA",
     description: "Help us build and maintain our cloud infrastructure. You'll work on CI/CD pipelines, monitoring, and automation.",
     skills: ["Kubernetes", "Terraform", "AWS", "GitHub Actions"],
     postedDate: twoDaysAgo,
     externalApplyLink: "https://example.com/apply/5",
     isReviewing: false,
   },
   {
     id: "6",
     title: "Mobile Developer",
     company: "AppWorks",
     location: "Chicago, IL (Hybrid)",
     description: "Build cross-platform mobile applications using React Native. You'll be responsible for the entire mobile experience.",
     skills: ["React Native", "iOS", "Android", "TypeScript"],
     postedDate: threeDaysAgo,
     externalApplyLink: "https://example.com/apply/6",
     isReviewing: true,
   },
   {
     id: "7",
     title: "Data Scientist",
     company: "Analytics Pro",
     location: "Boston, MA (Remote)",
     description: "Apply machine learning to solve real business problems. Work with large datasets and build predictive models.",
     skills: ["Python", "Machine Learning", "SQL", "TensorFlow"],
     postedDate: fourDaysAgo,
     externalApplyLink: "https://example.com/apply/7",
     isReviewing: false,
   },
 ];