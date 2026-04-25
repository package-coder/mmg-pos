// mockData.js
const mockProducts = [
    {
        name: 'Product 1',
        description: 'This is a description for Product 1',
        price: 29.99,
        sku: 'SKU001',
        category: 'Category 1',
        inventoryPrerequisite: [
            { sku: 'PREREQ001', quantity: 2 },
            { sku: 'PREREQ002', quantity: 1 }
        ]
    },
    {
        name: 'Service 1',
        description: 'This is a description for Product 2',
        price: 49.99,
        sku: 'SKU002',
        category: 'Category 2',
        inventoryPrerequisite: [{ sku: 'PREREQ003', quantity: 3 }]
    },
    {
        name: 'Product 3',
        description: 'This is a description for Product 3',
        price: 19.99,
        sku: 'SKU003',
        category: 'Category 3',
        inventoryPrerequisite: [
            { sku: 'PREREQ004', quantity: 1 },
            { sku: 'PREREQ005', quantity: 4 }
        ]
    }
    // Add more mock products as needed
];

const packages = [
    {
        _id: 1,
        name: 'Pre-employement',
        description: 'A package created for pre-employement requirements',
        packageType: 'Package',
        discount: 10,
        applyDiscountBy: 'perItem',
        labTest: [
            {
                id: 1,
                name: 'CBC',
                price: 200
            },
            {
                id: 2,
                name: 'Urinalysis',
                price: 200
            },
            {
                id: 3,
                name: 'Fecalysis',
                price: 200
            },
            {
                id: 4,
                name: 'Chest xray',
                price: 200
            },
            {
                id: 5,
                name: 'Medical Certificate',
                price: 200
            }
        ]
    },
    {
        _id: 2,
        name: 'Basic 10',
        description: '---',
        packageType: 'Package',
        discount: 10,
        applyDiscountBy: 'netTotal',
        labTest: [
            {
                productID: 1,
                productName: 'FBS',
                price: 200
            },
            {
                productID: 2,
                productName: 'BUA',
                price: 200
            },
            {
                productID: 3,
                productName: 'BUN',
                price: 200
            },
            {
                productID: 4,
                productName: 'Creatinine',
                price: 200
            },
            {
                productID: 5,
                productName: 'Cholesterol',
                price: 200
            },
            {
                productID: 6,
                productName: 'Triglyceride',
                price: 200
            },
            {
                productID: 7,
                productName: 'HDL/LDL',
                price: 200
            },
            {
                productID: 8,
                productName: 'SGOT',
                price: 200
            },
            {
                productID: 9,
                productName: 'SGPT',
                price: 200
            }
        ]
    }
];

const packageTypes = [
    {
        id: 'promo',
        type: 'Promo',
        description: 'Standard package type'
    },
    {
        id: 'package',
        type: 'Package',
        description: 'Premium package type'
    }
];

const customerType = [
    {
        id: 'member',
        name: 'Mebmer'
    },
    {
        id: 'non-member',
        name: 'Non-member'
    }
];

const dvoteDetails = [
    {
        name: 'Dvote Software Corporation',
        address: 'Ponso, Polangui, Albay',
        tin: '010-701-886-00000',
        accredNo: '---',
        accredDateIssued: '---',
        ptuNo: '---',
        ptuDateIssued: '---',
    }
];

export { packages, packageTypes, mockProducts, customerType, dvoteDetails };
